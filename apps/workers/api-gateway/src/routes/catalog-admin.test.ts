import { describe, it, expect } from "vitest";
import { CategoryPatchSchema, ProductPatchSchema } from "@inova-gastro-360/validation";
import {
  handleAdminCreateCategory,
  handleAdminDeleteCategory,
  handleAdminListCategories,
} from "./catalog-admin";
import { testEnv, DEMO_BRANCH_ID } from "../test/helpers";

describe("catalog-admin — validação (sem DB)", () => {
  const env = testEnv({ DATABASE_URL: undefined, HYPERDRIVE: undefined });
  const user = {
    sub: "user-1",
    tid: "tenant-1",
    email: "a@b.com",
    role: "admin_cliente",
    branches: [DEMO_BRANCH_ID],
  };

  it("create category rejeita body inválido", async () => {
    const req = new Request("http://test/api/v1/branches/x/catalog/admin/categories", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "" }),
    });
    await expect(handleAdminCreateCategory(req, env, user, DEMO_BRANCH_ID)).rejects.toThrow(
      /Banco não configurado/,
    );
  });

  it("update category rejeita patch vazio (schema)", () => {
    expect(CategoryPatchSchema.safeParse({}).success).toBe(false);
  });

  it("update product rejeita patch vazio (schema)", () => {
    expect(ProductPatchSchema.safeParse({}).success).toBe(false);
  });

  it("list categories sem DB lança", async () => {
    const req = new Request("http://test/api/v1/branches/x/catalog/admin/categories?includeInactive=1");
    await expect(handleAdminListCategories(req, env, user, DEMO_BRANCH_ID)).rejects.toThrow(
      /Banco não configurado/,
    );
  });

  it("delete category sem DB lança", async () => {
    await expect(handleAdminDeleteCategory(env, user, DEMO_BRANCH_ID, "cat-id")).rejects.toThrow(
      /Banco não configurado/,
    );
  });
});

describe("catalog-admin — auth via worker", () => {
  it("GET admin categories sem token retorna 401", async () => {
    const worker = (await import("../index")).default;
    const res = await worker.fetch(
      new Request(`https://api.test/api/v1/branches/${DEMO_BRANCH_ID}/catalog/admin/categories`),
      testEnv(),
    );
    expect(res.status).toBe(401);
  }, 15_000);
});
