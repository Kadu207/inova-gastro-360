import { ALLOWED_IMAGE_CONTENT_TYPES } from "@inova-gastro-360/validation";

export const MAX_CATALOG_IMAGE_BYTES = 5_242_880;

export type AllowedImageContentType = (typeof ALLOWED_IMAGE_CONTENT_TYPES)[number];

export function isAllowedImageContentType(value: string): value is AllowedImageContentType {
  return (ALLOWED_IMAGE_CONTENT_TYPES as readonly string[]).includes(value);
}

export function extensionForContentType(contentType: AllowedImageContentType): string {
  switch (contentType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
  }
}

/** Path multitenant — sem PII; UUIDs apenas. */
export function buildProductImageObjectKey(
  tenantId: string,
  branchId: string,
  productId: string,
  contentType: AllowedImageContentType,
  fileId = crypto.randomUUID(),
): string {
  const ext = extensionForContentType(contentType);
  return `tenants/${tenantId}/branches/${branchId}/products/${productId}/${fileId}.${ext}`;
}

export function buildPublicObjectUrl(publicBaseUrl: string, objectKey: string): string {
  const base = publicBaseUrl.replace(/\/$/, "");
  const key = objectKey.replace(/^\//, "");
  return `${base}/${key}`;
}

const UUID =
  "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

/** Chaves servidas publicamente via GET /media/{bucket}/... */
export function isPublicCatalogObjectKey(objectKey: string): boolean {
  const key = objectKey.replace(/^\/+/, "");
  return new RegExp(
    `^tenants/${UUID}/branches/${UUID}/products/${UUID}/[0-9a-f-]+\\.(jpg|jpeg|png|webp)$`,
    "i",
  ).test(key);
}

export function parseMediaPath(pathname: string, bucket: string): string | null {
  const prefix = `/media/${bucket}/`;
  if (!pathname.startsWith(prefix)) return null;
  const key = pathname.slice(prefix.length);
  if (!key || key.includes("..")) return null;
  return key;
}
