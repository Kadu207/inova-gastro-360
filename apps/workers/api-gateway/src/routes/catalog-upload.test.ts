import { describe, it, expect } from "vitest";
import { ProductInputSchema, ProductPatchSchema, PresignInputSchema } from "@inova-gastro-360/validation";
import {
  handleAdminCreateProduct,
  handleAdminDeleteProduct,
  handleAdminListProducts,
} from "./catalog-admin";
import { handleAdminPresignProductImage } from "./catalog-upload";
import { testEnv, DEMO_BRANCH_ID, DEMO_PRODUCT_ID } from "../test/helpers";

describe("catalog-admin produtos — validação (sem DB)", () => {
  const env = testEnv({ DATABASE_URL: undefined, HYPERDRIVE: undefined });
  const user = {
    sub: "user-1",
    tid: "tenant-1",
    email: "a@b.com",
    role: "admin_cliente",
    branches: [DEMO_BRANCH_ID],
  };

  it("create product rejeita preço inválido (schema)", () => {
    expect(
      ProductInputSchema.safeParse({
        categoryId: "00000000-0000-4000-8000-000000000010",
        name: "Item",
        priceCents: 0,
      }).success,
    ).toBe(false);
  });

  it("create product sem DB lança", async () => {
    const req = new Request("http://test/api/v1/branches/x/catalog/admin/products", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        categoryId: "00000000-0000-4000-8000-000000000010",
        name: "Teste",
        priceCents: 1000,
      }),
    });
    await expect(handleAdminCreateProduct(req, env, user, DEMO_BRANCH_ID)).rejects.toThrow(
      /Banco não configurado/,
    );
  });

  it("patch product rejeita vazio (schema)", () => {
    expect(ProductPatchSchema.safeParse({}).success).toBe(false);
  });

  it("list products sem DB lança", async () => {
    const req = new Request("http://test/api/v1/branches/x/catalog/admin/products?includeUnavailable=1");
    await expect(handleAdminListProducts(req, env, user, DEMO_BRANCH_ID)).rejects.toThrow(
      /Banco não configurado/,
    );
  });

  it("delete product sem DB lança", async () => {
    await expect(handleAdminDeleteProduct(env, user, DEMO_BRANCH_ID, DEMO_PRODUCT_ID)).rejects.toThrow(
      /Banco não configurado/,
    );
  });
});

describe("catalog-upload — validação (sem DB)", () => {
  const env = testEnv({ DATABASE_URL: undefined, HYPERDRIVE: undefined });
  const user = {
    sub: "user-1",
    tid: "tenant-1",
    email: "a@b.com",
    role: "admin_cliente",
    branches: [DEMO_BRANCH_ID],
  };

  it("presign rejeita MIME inválido (schema)", () => {
    expect(
      PresignInputSchema.safeParse({
        contentType: "application/pdf",
        contentLength: 1000,
      }).success,
    ).toBe(false);
  });

  it("presign sem DB lança após validação", async () => {
    const req = new Request("http://test/presign", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ contentType: "image/jpeg", contentLength: 1000 }),
    });
    await expect(
      handleAdminPresignProductImage(req, env, user, DEMO_BRANCH_ID, DEMO_PRODUCT_ID),
    ).rejects.toThrow(/Banco não configurado/);
  });
});

describe("catalog-admin produtos — auth via worker", () => {
  it("GET admin products sem token retorna 401", async () => {
    const worker = (await import("../index")).default;
    const res = await worker.fetch(
      new Request(`https://api.test/api/v1/branches/${DEMO_BRANCH_ID}/catalog/admin/products`),
      testEnv(),
    );
    expect(res.status).toBe(401);
  });

  it("POST presign sem token retorna 401", async () => {
    const worker = (await import("../index")).default;
    const res = await worker.fetch(
      new Request(
        `https://api.test/api/v1/branches/${DEMO_BRANCH_ID}/catalog/admin/products/${DEMO_PRODUCT_ID}/image/presign`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ contentType: "image/jpeg", contentLength: 1000 }),
        },
      ),
      testEnv(),
    );
    expect(res.status).toBe(401);
  });
});
