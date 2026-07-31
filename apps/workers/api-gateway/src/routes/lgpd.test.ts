import { describe, it, expect } from "vitest";
import { handlePostConsent, handleCreateErasureRequest } from "./lgpd";
import { testEnv, bearerToken, authRequest, testDatabaseUrl, DEMO_BRANCH_ID } from "../test/helpers";
import postgres from "postgres";
import { normalizeDatabaseUrl } from "../lib/db";

describe("lgpd", () => {
  it("POST consent registra preferências", async () => {
    const env = testEnv();
    const res = await handlePostConsent(
      new Request("https://api.test/api/v1/lgpd/consent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          branchId: DEMO_BRANCH_ID,
          subjectId: "subject-test-abcdefgh",
          analytics: true,
          marketing: false,
        }),
      }),
      env,
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { essential: boolean; analytics: boolean };
    expect(body.essential).toBe(true);
    expect(body.analytics).toBe(true);
  });

  it("erasure request exige admin", async () => {
    const sql = postgres(normalizeDatabaseUrl(testDatabaseUrl()), { max: 1, prepare: false });
    const [tenant] = await sql<{ id: string }[]>`SELECT id FROM tenants WHERE slug='demo-burger' LIMIT 1`;
    const [user] = await sql<{ id: string }[]>`SELECT id FROM users WHERE email='admin@inovagastro360.local' LIMIT 1`;
    await sql.end();
    if (!tenant || !user) return;

    const env = testEnv();
    const token = await bearerToken({
      sub: user.id,
      tid: tenant.id,
      role: "admin_cliente",
      email: "admin@inovagastro360.local",
    });
    const res = await handleCreateErasureRequest(
      authRequest("https://api.test/erasure", token, {
        method: "POST",
        body: JSON.stringify({ subjectId: "cliente@exemplo.com", subjectType: "customer" }),
      }),
      env,
      {
        sub: user.id,
        tid: tenant.id,
        role: "admin_cliente",
        email: "admin@inovagastro360.local",
      },
    );
    expect(res.status).toBe(201);
  });
});
