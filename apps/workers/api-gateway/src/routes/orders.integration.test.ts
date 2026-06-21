import postgres from "postgres";
import { describe, it, expect } from "vitest";
import worker from "../index";
import { normalizeDatabaseUrl } from "../lib/db";
import {
  authRequest,
  bearerToken,
  DEMO_BRANCH_ID,
  DEMO_PRODUCT_ID,
  TENANT_B,
  testDatabaseUrl,
  testEnv,
} from "../test/helpers";

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
    VALUES (${TENANT_B.tenantId}::uuid, 'Test Other', 'test-other', 'active', NOW(), NOW())
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
  await sql`
    INSERT INTO product_categories (id, tenant_id, branch_id, name, sort_order, created_at, updated_at)
    VALUES (${TENANT_B.categoryId}::uuid, ${TENANT_B.tenantId}::uuid, ${TENANT_B.branchId}::uuid, 'Cat B', 1, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING
  `;
  await sql`
    INSERT INTO products (id, tenant_id, branch_id, category_id, name, price_cents, is_available, created_at, updated_at)
    VALUES (
      ${TENANT_B.productId}::uuid,
      ${TENANT_B.tenantId}::uuid,
      ${TENANT_B.branchId}::uuid,
      ${TENANT_B.categoryId}::uuid,
      'Produto B',
      1000,
      true,
      NOW(),
      NOW()
    )
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
  if (!demo[0]) {
    await setupSql.end();
  } else {
    demoTenantId = demo[0].id;
    const admin = await setupSql<{ id: string }[]>`
      SELECT id FROM users WHERE email = 'admin@inovagastro360.local' AND tenant_id = ${demoTenantId}::uuid LIMIT 1
    `;
    demoUserId = admin[0]?.id ?? "00000000-0000-4000-8000-000000000001";
    await seedTenantB(setupSql);
    await setupSql.end();
  }
}

const integrationReady = dbReady && Boolean(demoTenantId);

describe.runIf(integrationReady)("orders integration — DB", () => {
  const env = testEnv();

  it("cria pedido no tenant demo e lista", async () => {
    const token = await bearerToken({
      sub: demoUserId,
      tid: demoTenantId,
      email: "admin@inovagastro360.local",
      role: "admin_cliente",
      branches: [DEMO_BRANCH_ID],
    });

    const createRes = await worker.fetch(
      authRequest("https://api.test/api/v1/orders", token, {
        method: "POST",
        body: JSON.stringify({
          branchId: DEMO_BRANCH_ID,
          channel: "web",
          items: [{ productId: DEMO_PRODUCT_ID, quantity: 2 }],
        }),
      }),
      env,
    );
    expect(createRes.status).toBe(201);
    const created = (await createRes.json()) as {
      order: { id: string; orderNumber: number; status: string; totalCents: number };
    };
    expect(created.order.status).toBe("pending");
    expect(created.order.totalCents).toBeGreaterThan(0);

    const listRes = await worker.fetch(
      authRequest(`https://api.test/api/v1/orders?branchId=${DEMO_BRANCH_ID}`, token),
      env,
    );
    expect(listRes.status).toBe(200);
    const listed = (await listRes.json()) as { orders: { id: string }[] };
    expect(listed.orders.some((o) => o.id === created.order.id)).toBe(true);
  });

  it("atualiza status do pedido", async () => {
    const token = await bearerToken({
      sub: demoUserId,
      tid: demoTenantId,
      email: "admin@inovagastro360.local",
      role: "admin_cliente",
      branches: [DEMO_BRANCH_ID],
    });

    const createRes = await worker.fetch(
      authRequest("https://api.test/api/v1/orders", token, {
        method: "POST",
        body: JSON.stringify({
          branchId: DEMO_BRANCH_ID,
          items: [{ productId: DEMO_PRODUCT_ID, quantity: 1 }],
        }),
      }),
      env,
    );
    const { order } = (await createRes.json()) as { order: { id: string } };

    const patchRes = await worker.fetch(
      authRequest(`https://api.test/api/v1/orders/${order.id}/status`, token, {
        method: "PATCH",
        body: JSON.stringify({ status: "accepted" }),
      }),
      env,
    );
    expect(patchRes.status).toBe(200);
    const updated = (await patchRes.json()) as { order: { status: string } };
    expect(updated.order.status).toBe("accepted");
  });

  it("cross-tenant: tenant B não acessa pedido do tenant A", async () => {
    const tokenA = await bearerToken({
      sub: demoUserId,
      tid: demoTenantId,
      email: "admin@inovagastro360.local",
      role: "admin_cliente",
      branches: [DEMO_BRANCH_ID],
    });

    const createRes = await worker.fetch(
      authRequest("https://api.test/api/v1/orders", tokenA, {
        method: "POST",
        body: JSON.stringify({
          branchId: DEMO_BRANCH_ID,
          items: [{ productId: DEMO_PRODUCT_ID, quantity: 1 }],
        }),
      }),
      env,
    );
    const { order } = (await createRes.json()) as { order: { id: string } };

    const tokenB = await bearerToken({
      sub: TENANT_B.userId,
      tid: TENANT_B.tenantId,
      email: "other@test.local",
      role: "admin_cliente",
      branches: [TENANT_B.branchId],
    });

    const getRes = await worker.fetch(
      authRequest(`https://api.test/api/v1/orders/${order.id}`, tokenB),
      env,
    );
    expect(getRes.status).toBe(404);

    const patchRes = await worker.fetch(
      authRequest(`https://api.test/api/v1/orders/${order.id}/status`, tokenB, {
        method: "PATCH",
        body: JSON.stringify({ status: "accepted" }),
      }),
      env,
    );
    expect(patchRes.status).toBe(404);

    const listRes = await worker.fetch(
      authRequest(`https://api.test/api/v1/orders?branchId=${DEMO_BRANCH_ID}`, tokenB),
      env,
    );
    expect(listRes.status).toBe(200);
    const listed = (await listRes.json()) as { orders: { id: string }[] };
    expect(listed.orders.some((o) => o.id === order.id)).toBe(false);
  });

  it("cross-tenant: tenant B cria pedido apenas no próprio catálogo", async () => {
    const tokenB = await bearerToken({
      sub: TENANT_B.userId,
      tid: TENANT_B.tenantId,
      email: "other@test.local",
      role: "admin_cliente",
      branches: [TENANT_B.branchId],
    });

    const failRes = await worker.fetch(
      authRequest("https://api.test/api/v1/orders", tokenB, {
        method: "POST",
        body: JSON.stringify({
          branchId: DEMO_BRANCH_ID,
          items: [{ productId: DEMO_PRODUCT_ID, quantity: 1 }],
        }),
      }),
      env,
    );
    expect(failRes.status).toBe(400);
    const failBody = (await failRes.json()) as { error: string };
    expect(failBody.error).toBe("invalid_products");

    const okRes = await worker.fetch(
      authRequest("https://api.test/api/v1/orders", tokenB, {
        method: "POST",
        body: JSON.stringify({
          branchId: TENANT_B.branchId,
          items: [{ productId: TENANT_B.productId, quantity: 1 }],
        }),
      }),
      env,
    );
    expect(okRes.status).toBe(201);
  });

  it("idempotência: retry com mesma Idempotency-Key retorna mesmo pedido", async () => {
    const token = await bearerToken({
      sub: demoUserId,
      tid: demoTenantId,
      email: "admin@inovagastro360.local",
      role: "admin_cliente",
      branches: [DEMO_BRANCH_ID],
    });

    const body = JSON.stringify({
      branchId: DEMO_BRANCH_ID,
      items: [{ productId: DEMO_PRODUCT_ID, quantity: 1 }],
    });
    const idempotencyKey = `test-idem-${crypto.randomUUID()}`;

    const first = await worker.fetch(
      authRequest("https://api.test/api/v1/orders", token, { method: "POST", body }, { "Idempotency-Key": idempotencyKey }),
      env,
    );
    expect(first.status).toBe(201);
    const firstBody = (await first.json()) as { order: { id: string; orderNumber: number } };

    const second = await worker.fetch(
      authRequest("https://api.test/api/v1/orders", token, { method: "POST", body }, { "Idempotency-Key": idempotencyKey }),
      env,
    );
    expect(second.status).toBe(200);
    const secondBody = (await second.json()) as { order: { id: string; orderNumber: number }; idempotent: boolean };
    expect(secondBody.idempotent).toBe(true);
    expect(secondBody.order.id).toBe(firstBody.order.id);
    expect(secondBody.order.orderNumber).toBe(firstBody.order.orderNumber);
  });

  it("paginação: limit e page retornam metadados", async () => {
    const token = await bearerToken({
      sub: demoUserId,
      tid: demoTenantId,
      email: "admin@inovagastro360.local",
      role: "admin_cliente",
      branches: [DEMO_BRANCH_ID],
    });

    const res = await worker.fetch(
      authRequest(`https://api.test/api/v1/orders?branchId=${DEMO_BRANCH_ID}&limit=2&page=1`, token),
      env,
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      orders: unknown[];
      pagination: { page: number; limit: number; total: number; totalPages: number; hasMore: boolean };
    };
    expect(data.pagination.page).toBe(1);
    expect(data.pagination.limit).toBe(2);
    expect(data.orders.length).toBeLessThanOrEqual(2);
    expect(typeof data.pagination.total).toBe("number");
  });

  it("print-jobs: pedido cria job pending e agente marca printed", async () => {
    const token = await bearerToken({
      sub: demoUserId,
      tid: demoTenantId,
      email: "admin@inovagastro360.local",
      role: "admin_cliente",
      branches: [DEMO_BRANCH_ID],
    });

    const createRes = await worker.fetch(
      authRequest("https://api.test/api/v1/orders", token, {
        method: "POST",
        body: JSON.stringify({
          branchId: DEMO_BRANCH_ID,
          items: [{ productId: DEMO_PRODUCT_ID, quantity: 1 }],
        }),
      }),
      env,
    );
    expect(createRes.status).toBe(201);

    const listRes = await worker.fetch(
      authRequest(
        `https://api.test/api/v1/print-jobs?branchId=${DEMO_BRANCH_ID}&sector=cozinha&status=pending`,
        token,
      ),
      env,
    );
    expect(listRes.status).toBe(200);
    const listed = (await listRes.json()) as { printJobs: { id: string }[] };
    expect(listed.printJobs.length).toBeGreaterThan(0);

    const jobId = listed.printJobs[0].id;
    const patchRes = await worker.fetch(
      authRequest(`https://api.test/api/v1/print-jobs/${jobId}`, token, {
        method: "PATCH",
        body: JSON.stringify({ status: "printed" }),
      }),
      env,
    );
    expect(patchRes.status).toBe(200);
  });
});
