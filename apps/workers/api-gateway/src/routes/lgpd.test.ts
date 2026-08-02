import { describe, it, expect, beforeAll } from "vitest";
import postgres from "postgres";
import {
  handlePostConsent,
  handleLgpdExport,
  handleCreateErasureRequest,
  handleListErasureRequests,
  handleUpdateErasureRequest,
} from "./lgpd";
import { testEnv, bearerToken, authRequest, testDatabaseUrl, DEMO_BRANCH_ID, TENANT_B } from "../test/helpers";
import { normalizeDatabaseUrl } from "../lib/db";

function jsonRequest(url: string, body: unknown): Request {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

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

describe("lgpd — consentimento (sem DB obrigatório para validação)", () => {
  it("rejeita subjectId inválido (400)", async () => {
    const env = testEnv();
    const res = await handlePostConsent(
      jsonRequest("https://api.test/api/v1/lgpd/consent", { subjectId: "abc", branchId: DEMO_BRANCH_ID }),
      env,
    );
    expect(res.status).toBe(400);
  });

  it("POST consent registra preferências", async () => {
    const env = testEnv();
    const res = await handlePostConsent(
      jsonRequest("https://api.test/api/v1/lgpd/consent", {
        branchId: DEMO_BRANCH_ID,
        subjectId: "subject-test-abcdefgh",
        analytics: true,
        marketing: false,
      }),
      env,
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { essential: boolean; analytics: boolean; marketing: boolean };
    expect(body.essential).toBe(true);
    expect(body.analytics).toBe(true);
    expect(body.marketing).toBe(false);
  });

  it("branchId inválido não vaza para tenant demo (404)", async () => {
    const env = testEnv();
    const res = await handlePostConsent(
      jsonRequest("https://api.test/api/v1/lgpd/consent", {
        branchId: "00000000-0000-4000-8000-00000000dead",
        subjectId: "subject-test-invalid-branch",
      }),
      env,
    );
    expect(res.status).toBe(404);
  });
});

describe.runIf(dbReady)("lgpd — export, erasure e RBAC (DB)", () => {
  const env = testEnv();
  let tenantId = "";
  let userId = "";

  beforeAll(async () => {
    const sql = postgres(normalizeDatabaseUrl(testDatabaseUrl()), { max: 1, prepare: false });
    const [tenant] = await sql<{ id: string }[]>`SELECT id FROM tenants WHERE slug='demo-burger' LIMIT 1`;
    const [user] = await sql<{ id: string }[]>`SELECT id FROM users WHERE email='admin@inovagastro360.local' LIMIT 1`;
    await sql.end();
    tenantId = tenant?.id ?? "";
    userId = user?.id ?? "";
  });

  it("erasure request exige admin (403 para atendente)", async () => {
    if (!tenantId || !userId) return;
    const env2 = testEnv();
    const atendente = {
      sub: userId,
      tid: tenantId,
      role: "atendente",
      email: "atendente@test.local",
      branches: [] as string[],
    };
    const token = await bearerToken(atendente);
    const res = await handleCreateErasureRequest(
      authRequest("https://api.test/erasure", token, {
        method: "POST",
        body: JSON.stringify({ subjectId: "cliente@exemplo.com", subjectType: "customer" }),
      }),
      env2,
      atendente,
    );
    expect(res.status).toBe(403);
  });

  it("cria, lista e atualiza solicitação de esquecimento (fluxo admin completo)", async () => {
    if (!tenantId || !userId) return;
    const admin = {
      sub: userId,
      tid: tenantId,
      role: "admin_cliente",
      email: "admin@inovagastro360.local",
      branches: [] as string[],
    };
    const token = await bearerToken(admin);

    const createRes = await handleCreateErasureRequest(
      authRequest("https://api.test/erasure", token, {
        method: "POST",
        body: JSON.stringify({ subjectId: "cliente@exemplo.com", subjectType: "customer", reason: "solicitação via WhatsApp" }),
      }),
      env,
      admin,
    );
    expect(createRes.status).toBe(201);
    const created = (await createRes.json()) as { id: string; status: string };
    expect(created.status).toBe("pending");

    const listRes = await handleListErasureRequests(
      authRequest("https://api.test/erasure", token),
      env,
      admin,
    );
    expect(listRes.status).toBe(200);
    const listed = (await listRes.json()) as { requests: { id: string }[] };
    expect(listed.requests.some((r) => r.id === created.id)).toBe(true);

    const updateRes = await handleUpdateErasureRequest(
      authRequest("https://api.test/erasure", token, {
        method: "PATCH",
        body: JSON.stringify({ status: "completed" }),
      }),
      env,
      admin,
      created.id,
    );
    expect(updateRes.status).toBe(200);
    const updated = (await updateRes.json()) as { id: string; status: string };
    expect(updated.status).toBe("completed");
  });

  it("update de solicitação inexistente retorna 404", async () => {
    if (!tenantId || !userId) return;
    const admin = {
      sub: userId,
      tid: tenantId,
      role: "admin_cliente",
      email: "admin@inovagastro360.local",
      branches: [] as string[],
    };
    const token = await bearerToken(admin);
    const res = await handleUpdateErasureRequest(
      authRequest("https://api.test/erasure", token, {
        method: "PATCH",
        body: JSON.stringify({ status: "rejected" }),
      }),
      env,
      admin,
      "00000000-0000-4000-8000-000000000fff",
    );
    expect(res.status).toBe(404);
  });

  it("titular exporta os próprios dados (JSON com consents e ordersSample)", async () => {
    if (!tenantId || !userId) return;
    const admin = {
      sub: userId,
      tid: tenantId,
      role: "admin_cliente",
      email: "admin@inovagastro360.local",
      branches: [] as string[],
    };
    const res = await handleLgpdExport(new Request("https://api.test/api/v1/lgpd/export"), env, admin);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { subject: { id: string }; consents: unknown[]; ordersSample: unknown[] };
    expect(body.subject.id).toBe(userId);
    expect(Array.isArray(body.consents)).toBe(true);
    expect(Array.isArray(body.ordersSample)).toBe(true);
  });

  it("cross-tenant: tenant B não vê solicitações do tenant A (RLS)", async () => {
    if (!tenantId || !userId) return;
    const admin = {
      sub: userId,
      tid: tenantId,
      role: "admin_cliente",
      email: "admin@inovagastro360.local",
      branches: [] as string[],
    };
    const token = await bearerToken(admin);
    await handleCreateErasureRequest(
      authRequest("https://api.test/erasure", token, {
        method: "POST",
        body: JSON.stringify({ subjectId: "isolamento@exemplo.com", subjectType: "customer" }),
      }),
      env,
      admin,
    );

    const otherAdmin = {
      sub: TENANT_B.userId,
      tid: TENANT_B.tenantId,
      role: "admin_cliente",
      email: "other@test.local",
      branches: [] as string[],
    };
    const otherToken = await bearerToken(otherAdmin);
    const listRes = await handleListErasureRequests(
      authRequest("https://api.test/erasure", otherToken),
      env,
      otherAdmin,
    );
    expect(listRes.status).toBe(200);
    const listed = (await listRes.json()) as { requests: { subject_id: string }[] };
    expect(listed.requests.some((r) => r.subject_id === "isolamento@exemplo.com")).toBe(false);
  });
});
