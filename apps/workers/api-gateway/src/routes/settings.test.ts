import { describe, it, expect } from "vitest";
import type { JwtPayload } from "@inova-gastro-360/auth";
import { handleGetCompany, handlePatchCompany } from "./settings";
import { handleListTenants, handlePatchTenant } from "./admin-tenants";
import type { GatewayEnv } from "../types/env";

const env = {} as GatewayEnv;

function user(role: string, tid = "00000000-0000-4000-8000-000000000001"): JwtPayload {
  return {
    sub: "00000000-0000-4000-8000-000000000099",
    tid,
    email: "u@test.local",
    role,
    branches: [],
  };
}

describe("settings RBAC (sem DB)", () => {
  it("atendente não lê company", async () => {
    const res = await handleGetCompany(new Request("https://api.test/x"), env, user("atendente"));
    expect(res.status).toBe(403);
  });

  it("atendente não patch company", async () => {
    const res = await handlePatchCompany(
      new Request("https://api.test/x", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tradeName: "X" }),
      }),
      env,
      user("atendente"),
    );
    expect(res.status).toBe(403);
  });
});

describe("admin tenants RBAC (sem DB)", () => {
  it("admin_cliente não lista tenants", async () => {
    const res = await handleListTenants(new Request("https://api.test/x"), env, user("admin_cliente"));
    expect(res.status).toBe(403);
  });

  it("admin_cliente não patch tenant", async () => {
    const res = await handlePatchTenant(
      new Request("https://api.test/x", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "suspended" }),
      }),
      env,
      user("admin_cliente"),
      "00000000-0000-4000-8000-000000000001",
    );
    expect(res.status).toBe(403);
  });
});
