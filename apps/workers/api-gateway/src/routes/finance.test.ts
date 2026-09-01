import { describe, it, expect } from "vitest";
import {
  handleOpenCash,
  handleCashSangria,
  handleCloseCash,
  handleGetOpenCash,
} from "./finance";
import {
  testEnv,
  DEMO_BRANCH_ID,
  bearerToken,
  authRequest,
  testDatabaseUrl,
} from "../test/helpers";
import postgres from "postgres";
import { normalizeDatabaseUrl } from "../lib/db";

describe("finance — caixa", () => {
  it("nega acesso a caixa de filial fora do JWT", async () => {
    const res = await handleGetOpenCash(
      new Request("https://api.test/"),
      testEnv(),
      {
        sub: "00000000-0000-4000-8000-000000000010",
        tid: "00000000-0000-4000-8000-000000000001",
        role: "gerente",
        email: "gerente@test.local",
        branches: ["00000000-0000-4000-8000-000000000099"],
      },
      DEMO_BRANCH_ID,
    );
    expect(res.status).toBe(403);
  });

  it("abre caixa, sangria e fecha (TDD)", async () => {
    const sql = postgres(normalizeDatabaseUrl(testDatabaseUrl()), { max: 1, prepare: false });
    const [tenant] = await sql<{ id: string }[]>`
      SELECT id FROM tenants WHERE slug = 'demo-burger' LIMIT 1
    `;
    const [user] = await sql<{ id: string }[]>`
      SELECT id FROM users WHERE email = 'admin@inovagastro360.local' LIMIT 1
    `;
    if (!tenant || !user) {
      await sql.end();
      return;
    }
    await sql`
      UPDATE cash_sessions SET status = 'closed', closed_at = NOW(), updated_at = NOW()
      WHERE tenant_id = ${tenant.id}::uuid AND branch_id = ${DEMO_BRANCH_ID}::uuid AND status = 'open'
    `;
    await sql.end();

    const env = testEnv();
    const token = await bearerToken({
      sub: user.id,
      tid: tenant.id,
      role: "admin_cliente",
      email: "admin@inovagastro360.local",
      branches: [DEMO_BRANCH_ID],
    });

    const openRes = await handleOpenCash(
      authRequest(
        "https://api.test/api/v1/finance/cash/open",
        token,
        {
          method: "POST",
          body: JSON.stringify({ branchId: DEMO_BRANCH_ID, openingCents: 10000 }),
        },
      ),
      env,
      {
        sub: user.id,
        tid: tenant.id,
        role: "admin_cliente",
        email: "admin@inovagastro360.local",
        branches: [DEMO_BRANCH_ID],
      },
    );
    expect(openRes.status).toBe(201);
    const opened = (await openRes.json()) as { sessionId: string };

    const sangriaRes = await handleCashSangria(
      authRequest(
        `https://api.test/api/v1/finance/cash/${opened.sessionId}/sangria`,
        token,
        {
          method: "POST",
          body: JSON.stringify({ amountCents: 500, description: "Troco banco" }),
        },
      ),
      env,
      {
        sub: user.id,
        tid: tenant.id,
        role: "admin_cliente",
        email: "admin@inovagastro360.local",
        branches: [DEMO_BRANCH_ID],
      },
      opened.sessionId,
    );
    expect(sangriaRes.status).toBe(201);
    const move = (await sangriaRes.json()) as { amountCents: number };
    expect(move.amountCents).toBe(-500);

    const getRes = await handleGetOpenCash(
      new Request("https://api.test/"),
      env,
      {
        sub: user.id,
        tid: tenant.id,
        role: "admin_cliente",
        email: "admin@inovagastro360.local",
        branches: [DEMO_BRANCH_ID],
      },
      DEMO_BRANCH_ID,
    );
    expect(getRes.status).toBe(200);

    const closeRes = await handleCloseCash(
      authRequest(
        `https://api.test/close`,
        token,
        {
          method: "POST",
          body: JSON.stringify({ closingCents: 9500 }),
        },
      ),
      env,
      {
        sub: user.id,
        tid: tenant.id,
        role: "admin_cliente",
        email: "admin@inovagastro360.local",
        branches: [DEMO_BRANCH_ID],
      },
      opened.sessionId,
    );
    expect(closeRes.status).toBe(200);
  });

  it("cross-tenant: tenant B não vê sessão do tenant A", async () => {
    const env = testEnv();
    const fakeUser = {
      sub: "00000000-0000-4000-8000-00000000b004",
      tid: "00000000-0000-4000-8000-00000000b001",
      role: "admin_cliente",
      email: "b@test.local",
      branches: [] as string[],
    };
    const res = await handleGetOpenCash(
      new Request("https://api.test/"),
      env,
      fakeUser,
      DEMO_BRANCH_ID,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { session: unknown };
    expect(body.session).toBeNull();
  });
});
