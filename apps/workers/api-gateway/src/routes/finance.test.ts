import postgres from "postgres";
import { describe, it, expect } from "vitest";
import {
  handleOpenCash,
  handleCloseCash,
  handleCashSangria,
  handleCashSuprimento,
  handleGetOpenCash,
  handleCreatePayable,
  handleListPayables,
  handleGetPayable,
  handlePayPayable,
  handleCreateReceivable,
  handleListReceivables,
  handleGetReceivable,
  handleReceiveReceivable,
  handleFinanceDre,
  handleFinanceExport,
} from "./finance";
import {
  testEnv,
  testDatabaseUrl,
  bearerToken,
  authRequest,
  DEMO_BRANCH_ID,
  TENANT_B,
} from "../test/helpers";
import { normalizeDatabaseUrl } from "../lib/db";
import type { JwtPayload } from "@inova-gastro-360/auth";

async function probeDatabase(): Promise<boolean> {
  try {
    const probe = postgres(normalizeDatabaseUrl(testDatabaseUrl()), { max: 1, prepare: false });
    await probe`SELECT 1`;
    await probe.end();
    return true;
  } catch {
    return false;
  }
}

async function seedTenantB(sql: ReturnType<typeof postgres>): Promise<void> {
  await sql`
    INSERT INTO tenants (id, name, slug, status, created_at, updated_at)
    VALUES (${TENANT_B.tenantId}::uuid, 'Test Other Finance', 'test-other-finance', 'active', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING
  `;
  await sql`
    INSERT INTO companies (id, tenant_id, trade_name, legal_name, created_at, updated_at)
    VALUES (${TENANT_B.companyId}::uuid, ${TENANT_B.tenantId}::uuid, 'Other Co', 'Other LTDA', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING
  `;
  await sql`
    INSERT INTO branches (id, tenant_id, company_id, name, created_at, updated_at)
    VALUES (${TENANT_B.branchId}::uuid, ${TENANT_B.tenantId}::uuid, ${TENANT_B.companyId}::uuid, 'Filial B', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING
  `;
}

const dbReady = await probeDatabase();
let demoTenantId = "";
let demoUserId = "";

if (dbReady) {
  const setupSql = postgres(normalizeDatabaseUrl(testDatabaseUrl()), { max: 1, prepare: false });
  const demo = await setupSql<{ id: string }[]>`
    SELECT id FROM tenants WHERE slug = 'demo-burger' LIMIT 1
  `;
  if (demo[0]) {
    demoTenantId = demo[0].id;
    const admin = await setupSql<{ id: string }[]>`
      SELECT id FROM users WHERE email = 'admin@inovagastro360.local' AND tenant_id = ${demoTenantId}::uuid LIMIT 1
    `;
    demoUserId = admin[0]?.id ?? "00000000-0000-4000-8000-000000000001";
    await seedTenantB(setupSql);
  }
  await setupSql.end();
}

const integrationReady = dbReady && Boolean(demoTenantId);

function financeUser(overrides: Partial<JwtPayload> = {}): JwtPayload {
  return {
    sub: demoUserId,
    tid: demoTenantId,
    email: "admin@inovagastro360.local",
    role: "admin_cliente",
    branches: [],
    ...overrides,
  };
}

describe("finance — validação (sem DB)", () => {
  const env = testEnv();
  const user = financeUser({ tid: "tenant-1", sub: "user-1" });

  it("rejeita papel sem permissão financeira", async () => {
    const atendente: JwtPayload = { ...user, role: "atendente" };
    const req = new Request("https://api.test/api/v1/finance/cash/open", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ branchId: DEMO_BRANCH_ID, openingCents: 0 }),
    });
    const res = await handleOpenCash(req, env, atendente);
    expect(res.status).toBe(403);
  });

  it("abertura de caixa rejeita body inválido", async () => {
    const req = new Request("https://api.test/api/v1/finance/cash/open", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ branchId: "not-uuid" }),
    });
    const res = await handleOpenCash(req, env, user);
    expect(res.status).toBe(400);
  });

  it("sangria rejeita valor não positivo", async () => {
    const req = new Request("https://api.test/api/v1/finance/cash/x/sangria", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ amountCents: -10, description: "teste" }),
    });
    const res = await handleCashSangria(req, env, user, "00000000-0000-4000-8000-000000000000");
    expect(res.status).toBe(400);
  });

  it("contas a pagar rejeitam body sem dueDate válido", async () => {
    const req = new Request("https://api.test/api/v1/finance/payables", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ description: "Aluguel", amountCents: 1000, dueDate: "not-a-date" }),
    });
    const res = await handleCreatePayable(req, env, user);
    expect(res.status).toBe(400);
  });
});

describe.runIf(integrationReady)("finance — caixa (DB)", () => {
  const env = testEnv();

  it("abre caixa, faz sangria/suprimento, consulta e fecha", async () => {
    const sql = postgres(normalizeDatabaseUrl(testDatabaseUrl()), { max: 1, prepare: false });
    await sql`
      UPDATE cash_sessions SET status = 'closed', closed_at = NOW(), updated_at = NOW()
      WHERE tenant_id = ${demoTenantId}::uuid AND branch_id = ${DEMO_BRANCH_ID}::uuid AND status = 'open'
    `;
    await sql.end();

    const token = await bearerToken(financeUser());
    const user = financeUser();

    const openRes = await handleOpenCash(
      authRequest("https://api.test/api/v1/finance/cash/open", token, {
        method: "POST",
        body: JSON.stringify({ branchId: DEMO_BRANCH_ID, openingCents: 10000 }),
      }),
      env,
      user,
    );
    expect(openRes.status).toBe(201);
    const opened = (await openRes.json()) as { sessionId: string };

    const reopenRes = await handleOpenCash(
      authRequest("https://api.test/api/v1/finance/cash/open", token, {
        method: "POST",
        body: JSON.stringify({ branchId: DEMO_BRANCH_ID, openingCents: 500 }),
      }),
      env,
      user,
    );
    expect(reopenRes.status).toBe(409);

    const sangriaRes = await handleCashSangria(
      authRequest(`https://api.test/api/v1/finance/cash/${opened.sessionId}/sangria`, token, {
        method: "POST",
        body: JSON.stringify({ amountCents: 500, description: "Troco banco" }),
      }),
      env,
      user,
      opened.sessionId,
    );
    expect(sangriaRes.status).toBe(201);
    const sangria = (await sangriaRes.json()) as { amountCents: number };
    expect(sangria.amountCents).toBe(-500);

    const suprimentoRes = await handleCashSuprimento(
      authRequest(`https://api.test/api/v1/finance/cash/${opened.sessionId}/suprimento`, token, {
        method: "POST",
        body: JSON.stringify({ amountCents: 200, description: "Reforço de troco" }),
      }),
      env,
      user,
      opened.sessionId,
    );
    expect(suprimentoRes.status).toBe(201);
    const suprimento = (await suprimentoRes.json()) as { amountCents: number };
    expect(suprimento.amountCents).toBe(200);

    const getRes = await handleGetOpenCash(new Request("https://api.test/"), env, user, DEMO_BRANCH_ID);
    expect(getRes.status).toBe(200);
    const openSession = (await getRes.json()) as { session: { ledgerTotalCents: number } | null };
    // abertura (10000) - sangria (500) + suprimento (200) = 9700
    expect(openSession.session?.ledgerTotalCents).toBe(9700);

    const closeRes = await handleCloseCash(
      authRequest(`https://api.test/close`, token, {
        method: "POST",
        body: JSON.stringify({ closingCents: 9700 }),
      }),
      env,
      user,
      opened.sessionId,
    );
    expect(closeRes.status).toBe(200);

    const closeAgainRes = await handleCloseCash(
      authRequest(`https://api.test/close`, token, {
        method: "POST",
        body: JSON.stringify({ closingCents: 9700 }),
      }),
      env,
      user,
      opened.sessionId,
    );
    expect(closeAgainRes.status).toBe(404);
  });

  it("cross-tenant: tenant B não vê nem fecha sessão de caixa do tenant A", async () => {
    const sql = postgres(normalizeDatabaseUrl(testDatabaseUrl()), { max: 1, prepare: false });
    await sql`
      UPDATE cash_sessions SET status = 'closed', closed_at = NOW(), updated_at = NOW()
      WHERE tenant_id = ${demoTenantId}::uuid AND branch_id = ${DEMO_BRANCH_ID}::uuid AND status = 'open'
    `;
    const userA = financeUser();
    const tokenA = await bearerToken(userA);
    const openRes = await handleOpenCash(
      authRequest("https://api.test/api/v1/finance/cash/open", tokenA, {
        method: "POST",
        body: JSON.stringify({ branchId: DEMO_BRANCH_ID, openingCents: 1000 }),
      }),
      env,
      userA,
    );
    const opened = (await openRes.json()) as { sessionId: string };

    const userB = financeUser({ sub: TENANT_B.userId, tid: TENANT_B.tenantId, email: "b@test.local" });
    const tokenB = await bearerToken(userB);

    const getResB = await handleGetOpenCash(new Request("https://api.test/"), env, userB, DEMO_BRANCH_ID);
    const bodyB = (await getResB.json()) as { session: unknown };
    expect(bodyB.session).toBeNull();

    const closeResB = await handleCloseCash(
      authRequest(`https://api.test/close`, tokenB, {
        method: "POST",
        body: JSON.stringify({ closingCents: 1000 }),
      }),
      env,
      userB,
      opened.sessionId,
    );
    expect(closeResB.status).toBe(404);

    await sql`
      UPDATE cash_sessions SET status = 'closed', closed_at = NOW(), updated_at = NOW()
      WHERE id = ${opened.sessionId}::uuid
    `;
    await sql.end();
  });
});

describe.runIf(integrationReady)("finance — contas a pagar/receber e DRE (DB)", () => {
  const env = testEnv();

  it("cria, lista, consulta e paga uma conta a pagar", async () => {
    const user = financeUser();
    const dueDate = new Date(Date.now() + 5 * 86_400_000).toISOString();

    const createRes = await handleCreatePayable(
      new Request("https://api.test/api/v1/finance/payables", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          branchId: DEMO_BRANCH_ID,
          description: "Fornecedor de pão",
          amountCents: 15000,
          dueDate,
          supplier: "Padaria Central",
        }),
      }),
      env,
      user,
    );
    expect(createRes.status).toBe(201);
    const created = (await createRes.json()) as { id: string };

    const listRes = await handleListPayables(new Request("https://api.test/"), env, user);
    expect(listRes.status).toBe(200);
    const listed = (await listRes.json()) as { payables: { id: string }[] };
    expect(listed.payables.some((p) => p.id === created.id)).toBe(true);

    const getRes = await handleGetPayable(new Request("https://api.test/"), env, user, created.id);
    expect(getRes.status).toBe(200);
    const got = (await getRes.json()) as { payable: { status: string } };
    expect(got.payable.status).toBe("open");

    const payRes = await handlePayPayable(
      new Request("https://api.test/", { method: "POST", body: "{}" }),
      env,
      user,
      created.id,
    );
    expect(payRes.status).toBe(200);
    const paid = (await payRes.json()) as { status: string; settledAmountCents: number };
    expect(paid.status).toBe("paid");
    expect(paid.settledAmountCents).toBe(15000);

    const payAgainRes = await handlePayPayable(
      new Request("https://api.test/", { method: "POST", body: "{}" }),
      env,
      user,
      created.id,
    );
    expect(payAgainRes.status).toBe(404);
  });

  it("cria, lista, consulta e recebe uma conta a receber", async () => {
    const user = financeUser();
    const dueDate = new Date(Date.now() + 3 * 86_400_000).toISOString();

    const createRes = await handleCreateReceivable(
      new Request("https://api.test/api/v1/finance/receivables", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          branchId: DEMO_BRANCH_ID,
          description: "Recebimento avulso",
          amountCents: 8000,
          dueDate,
          customer: "Cliente balcão",
        }),
      }),
      env,
      user,
    );
    expect(createRes.status).toBe(201);
    const created = (await createRes.json()) as { id: string };

    const listRes = await handleListReceivables(new Request("https://api.test/"), env, user);
    expect(listRes.status).toBe(200);
    const listed = (await listRes.json()) as { receivables: { id: string }[] };
    expect(listed.receivables.some((r) => r.id === created.id)).toBe(true);

    const getRes = await handleGetReceivable(new Request("https://api.test/"), env, user, created.id);
    expect(getRes.status).toBe(200);

    const receiveRes = await handleReceiveReceivable(
      new Request("https://api.test/", { method: "POST", body: "{}" }),
      env,
      user,
      created.id,
    );
    expect(receiveRes.status).toBe(200);
    const received = (await receiveRes.json()) as { status: string };
    expect(received.status).toBe("received");
  });

  it("DRE retorna receita, despesas e resultado do período", async () => {
    const user = financeUser();
    const res = await handleFinanceDre(new Request("https://api.test/api/v1/finance/dre"), env, user);
    expect(res.status).toBe(200);
    const dre = (await res.json()) as { revenueCents: number; expensesCents: number; resultCents: number };
    expect(typeof dre.revenueCents).toBe("number");
    expect(typeof dre.expensesCents).toBe("number");
    expect(dre.resultCents).toBe(dre.revenueCents - dre.expensesCents);
  });

  it("export CSV retorna cabeçalho e content-type text/csv", async () => {
    const user = financeUser();
    const res = await handleFinanceExport(
      new Request("https://api.test/api/v1/finance/export?format=csv"),
      env,
      user,
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/csv");
    const text = await res.text();
    expect(text.startsWith("tipo,valor_centavos,descricao,criado_em")).toBe(true);
  });

  it("export JSON retorna lista de lançamentos", async () => {
    const user = financeUser();
    const res = await handleFinanceExport(
      new Request("https://api.test/api/v1/finance/export?format=json"),
      env,
      user,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { entries: unknown[] };
    expect(Array.isArray(body.entries)).toBe(true);
  });
});
