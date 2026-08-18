import { describe, it, expect } from "vitest";
import {
  buildProductImageObjectKey,
  buildPublicObjectUrl,
  detectImageContentTypeFromBuffer,
  isAllowedImageContentType,
  isAllowedStoredProductImageUrl,
  isPublicCatalogObjectKey,
  parseMediaPath,
  validateImageBuffer,
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

  it("valida object key pública do catálogo", () => {
    const key = `tenants/${tenantId}/branches/${branchId}/products/${productId}/abc.webp`;
    expect(isPublicCatalogObjectKey(key)).toBe(true);
    expect(isPublicCatalogObjectKey("tenants/evil/../../etc/passwd")).toBe(false);
  });

  it("parseMediaPath extrai key do pathname", () => {
    const key = parseMediaPath(
      `/media/inova-gastro-360/tenants/${tenantId}/branches/${branchId}/products/${productId}/x.png`,
      "inova-gastro-360",
    );
    expect(key).toContain("tenants/");
  });

  it("detecta JPEG pelos magic bytes", () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00]);
    expect(detectImageContentTypeFromBuffer(jpeg)).toBe("image/jpeg");
  });

  it("detecta PNG pelos magic bytes", () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(detectImageContentTypeFromBuffer(png)).toBe("image/png");
  });

  it("rejeita MIME declarado que não bate com conteúdo", () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(validateImageBuffer(png, "image/jpeg").ok).toBe(false);
    expect(validateImageBuffer(png, "image/png").ok).toBe(true);
  });

  it("isAllowedStoredProductImageUrl restringe ao publicBase", () => {
    const base = "https://cdn.example.com/bucket";
    const key = `tenants/${tenantId}/branches/${branchId}/products/${productId}/abc.webp`;
    expect(isAllowedStoredProductImageUrl(null, base)).toBe(true);
    expect(isAllowedStoredProductImageUrl(`${base}/${key}`, base)).toBe(true);
    expect(isAllowedStoredProductImageUrl("https://evil.example/x.webp", base)).toBe(false);
    expect(isAllowedStoredProductImageUrl(`${base}/other/path.jpg`, base)).toBe(false);
  });
});
