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
