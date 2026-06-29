import { describe, it, expect } from "vitest";
import {
  buildProductImageObjectKey,
  buildPublicObjectUrl,
  isAllowedImageContentType,
  MAX_CATALOG_IMAGE_BYTES,
} from "./image-policy";

describe("image-policy", () => {
  const tenantId = "11111111-1111-4111-8111-111111111111";
  const branchId = "22222222-2222-4222-8222-222222222222";
  const productId = "33333333-3333-4333-8333-333333333333";

  it("aceita MIME de imagem", () => {
    expect(isAllowedImageContentType("image/jpeg")).toBe(true);
    expect(isAllowedImageContentType("application/pdf")).toBe(false);
  });

  it("gera path tenant-scoped", () => {
    const key = buildProductImageObjectKey(tenantId, branchId, productId, "image/webp", "abc");
    expect(key).toBe(`tenants/${tenantId}/branches/${branchId}/products/${productId}/abc.webp`);
    expect(key).toContain(tenantId);
  });

  it("monta URL pública", () => {
    const url = buildPublicObjectUrl("https://cdn.example.com/bucket", "tenants/x/a.jpg");
    expect(url).toBe("https://cdn.example.com/bucket/tenants/x/a.jpg");
  });

  it("limite 5MB documentado", () => {
    expect(MAX_CATALOG_IMAGE_BYTES).toBe(5_242_880);
  });
});
