import { describe, it, expect } from "vitest";
import { handleCatalogCategories, handleCatalogProducts } from "./catalog";
import { testEnv, DEMO_BRANCH_ID } from "../test/helpers";

describe("catalog público — sem DB", () => {
  const env = testEnv({ DATABASE_URL: undefined, HYPERDRIVE: undefined });

  it("categories exige banco", async () => {
    const req = new Request(`http://test/api/v1/branches/${DEMO_BRANCH_ID}/catalog/categories`);
    await expect(handleCatalogCategories(req, env, DEMO_BRANCH_ID)).rejects.toThrow(
      /Banco não configurado/,
    );
  });

  it("products exige banco", async () => {
    const req = new Request(`http://test/api/v1/branches/${DEMO_BRANCH_ID}/catalog/products`);
    await expect(handleCatalogProducts(req, env, DEMO_BRANCH_ID)).rejects.toThrow(
      /Banco não configurado/,
    );
  });
});
