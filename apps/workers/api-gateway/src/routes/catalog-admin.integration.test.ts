import postgres from "postgres";
import { describe, it, expect } from "vitest";
import worker from "../index";
import { normalizeDatabaseUrl } from "../lib/db";
import {
  authRequest,
  bearerToken,
  DEMO_BRANCH_ID,
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
    demoUserId = admin[0]?.id ?? "";
  }
  await setupSql.end();
}

const env = testEnv();
const canRun = dbReady && demoTenantId && demoUserId;

describe.skipIf(!canRun)("catalog-admin integration", () => {
  it("CRUD categoria admin + isolamento tenant", async () => {
    const token = await bearerToken({
      sub: demoUserId,
      tid: demoTenantId,
      email: "admin@inovagastro360.local",
      role: "admin_cliente",
      branches: [DEMO_BRANCH_ID],
    });

    const createRes = await worker.fetch(
      authRequest(
        `https://api.test/api/v1/branches/${DEMO_BRANCH_ID}/catalog/admin/categories`,
        token,
        {
          method: "POST",
          body: JSON.stringify({ name: "Porções Teste", sortOrder: 99, isActive: true }),
        },
      ),
      env,
    );
    expect(createRes.status).toBe(201);
    const created = (await createRes.json()) as { category: { id: string; name: string } };
    expect(created.category.name).toBe("Porções Teste");

    const auditSql = postgres(normalizeDatabaseUrl(testDatabaseUrl()), { max: 1, prepare: false });
    const audits = await auditSql<{ action: string }[]>`
      SELECT action FROM audit_logs
      WHERE tenant_id = ${demoTenantId}::uuid
        AND user_id = ${demoUserId}::uuid
        AND resource = ${`product_category:${created.category.id}`}
    `;
    expect(audits.some((a) => a.action === "catalog.category.create")).toBe(true);
    await auditSql.end();

    const listRes = await worker.fetch(
      authRequest(
        `https://api.test/api/v1/branches/${DEMO_BRANCH_ID}/catalog/admin/categories?includeInactive=1`,
        token,
      ),
      env,
    );
    expect(listRes.status).toBe(200);
    const list = (await listRes.json()) as { categories: { id: string }[] };
    expect(list.categories.some((c) => c.id === created.category.id)).toBe(true);

    const patchRes = await worker.fetch(
      authRequest(
        `https://api.test/api/v1/branches/${DEMO_BRANCH_ID}/catalog/admin/categories/${created.category.id}`,
        token,
        { method: "PATCH", body: JSON.stringify({ name: "Porções E2E" }) },
      ),
      env,
    );
    expect(patchRes.status).toBe(200);

    const otherToken = await bearerToken({
      sub: TENANT_B.userId,
      tid: TENANT_B.tenantId,
      email: "other@test.local",
      role: "admin_cliente",
      branches: [TENANT_B.branchId],
    });
    const forbidden = await worker.fetch(
      authRequest(
        `https://api.test/api/v1/branches/${DEMO_BRANCH_ID}/catalog/admin/categories/${created.category.id}`,
        otherToken,
        { method: "PATCH", body: JSON.stringify({ name: "Hack" }) },
      ),
      env,
    );
    expect(forbidden.status).toBe(403);

    const delRes = await worker.fetch(
      authRequest(
        `https://api.test/api/v1/branches/${DEMO_BRANCH_ID}/catalog/admin/categories/${created.category.id}`,
        token,
        { method: "DELETE" },
      ),
      env,
    );
    expect(delRes.status).toBe(200);
  });

  it("CRUD produto admin + isolamento tenant", async () => {
    const token = await bearerToken({
      sub: demoUserId,
      tid: demoTenantId,
      email: "admin@inovagastro360.local",
      role: "admin_cliente",
      branches: [DEMO_BRANCH_ID],
    });

    const catRes = await worker.fetch(
      authRequest(
        `https://api.test/api/v1/branches/${DEMO_BRANCH_ID}/catalog/admin/categories`,
        token,
        {
          method: "POST",
          body: JSON.stringify({ name: "Cat Produto E2E", sortOrder: 88, isActive: true }),
        },
      ),
      env,
    );
    expect(catRes.status).toBe(201);
    const cat = (await catRes.json()) as { category: { id: string } };

    const createRes = await worker.fetch(
      authRequest(
        `https://api.test/api/v1/branches/${DEMO_BRANCH_ID}/catalog/admin/products`,
        token,
        {
          method: "POST",
          body: JSON.stringify({
            categoryId: cat.category.id,
            name: "Produto E2E",
            description: "Teste integração",
            priceCents: 2590,
            isAvailable: true,
          }),
        },
      ),
      env,
    );
    expect(createRes.status).toBe(201);
    const created = (await createRes.json()) as { product: { id: string; name: string } };
    expect(created.product.name).toBe("Produto E2E");

    const listRes = await worker.fetch(
      authRequest(
        `https://api.test/api/v1/branches/${DEMO_BRANCH_ID}/catalog/admin/products?includeUnavailable=1`,
        token,
      ),
      env,
    );
    expect(listRes.status).toBe(200);
    const list = (await listRes.json()) as { products: { id: string }[] };
    expect(list.products.some((p) => p.id === created.product.id)).toBe(true);

    const patchRes = await worker.fetch(
      authRequest(
        `https://api.test/api/v1/branches/${DEMO_BRANCH_ID}/catalog/admin/products/${created.product.id}`,
        token,
        { method: "PATCH", body: JSON.stringify({ name: "Produto E2E Editado", priceCents: 2990 }) },
      ),
      env,
    );
    expect(patchRes.status).toBe(200);

    const otherToken = await bearerToken({
      sub: TENANT_B.userId,
      tid: TENANT_B.tenantId,
      email: "other@test.local",
      role: "admin_cliente",
      branches: [TENANT_B.branchId],
    });
    const forbidden = await worker.fetch(
      authRequest(
        `https://api.test/api/v1/branches/${DEMO_BRANCH_ID}/catalog/admin/products/${created.product.id}`,
        otherToken,
        { method: "PATCH", body: JSON.stringify({ name: "Hack" }) },
      ),
      env,
    );
    expect(forbidden.status).toBe(403);

    const delRes = await worker.fetch(
      authRequest(
        `https://api.test/api/v1/branches/${DEMO_BRANCH_ID}/catalog/admin/products/${created.product.id}`,
        token,
        { method: "DELETE" },
      ),
      env,
    );
    expect(delRes.status).toBe(200);

    const delCatRes = await worker.fetch(
      authRequest(
        `https://api.test/api/v1/branches/${DEMO_BRANCH_ID}/catalog/admin/categories/${cat.category.id}`,
        token,
        { method: "DELETE" },
      ),
      env,
    );
    expect(delCatRes.status).toBe(200);
  });

  it("presign desabilitado retorna 410", async () => {
    const token = await bearerToken({
      sub: demoUserId,
      tid: demoTenantId,
      email: "admin@inovagastro360.local",
      role: "admin_cliente",
      branches: [DEMO_BRANCH_ID],
    });

    const badRes = await worker.fetch(
      authRequest(
        `https://api.test/api/v1/branches/${DEMO_BRANCH_ID}/catalog/admin/products/00000000-0000-4000-8000-000000000020/image/presign`,
        token,
        {
          method: "POST",
          body: JSON.stringify({ contentType: "image/jpeg", contentLength: 1000 }),
        },
      ),
      env,
    );
    expect(badRes.status).toBe(410);
  });
});
