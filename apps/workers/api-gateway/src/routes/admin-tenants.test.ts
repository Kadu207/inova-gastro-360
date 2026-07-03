import { describe, it, expect } from "vitest";
import { handleCreateTenant } from "./admin-tenants";
import { testEnv } from "../test/helpers";

const basePayload = {
  name: "Nova Pizzaria",
  slug: "nova-pizzaria",
  admin: { name: "Dono", email: "dono@nova.com", password: "senha-forte-123" },
};

function jsonRequest(body: unknown): Request {
  return new Request("https://api.test/api/v1/admin/tenants", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/v1/admin/tenants — RBAC e validação (sem DB)", () => {
  const env = testEnv({ DATABASE_URL: undefined, HYPERDRIVE: undefined });

  it("nega usuário que não é super_admin (403)", async () => {
    const user = { sub: "u", tid: "t", email: "a@b.com", role: "admin_cliente", branches: [] };
    const res = await handleCreateTenant(jsonRequest(basePayload), env, user);
    expect(res.status).toBe(403);
  });

  it("rejeita payload sem admin (400)", async () => {
    const user = { sub: "u", tid: "t", email: "a@b.com", role: "super_admin", branches: [] };
    const res = await handleCreateTenant(
      jsonRequest({ name: "X Burger", slug: "x-burger" }),
      env,
      user,
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("validation_error");
  });

  it("rejeita slug inválido (400)", async () => {
    const user = { sub: "u", tid: "t", email: "a@b.com", role: "super_admin", branches: [] };
    const res = await handleCreateTenant(
      jsonRequest({ ...basePayload, slug: "Slug Inválido!" }),
      env,
      user,
    );
    expect(res.status).toBe(400);
  });
});
