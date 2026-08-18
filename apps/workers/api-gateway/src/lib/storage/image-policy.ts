import { ALLOWED_IMAGE_CONTENT_TYPES } from "@inova-gastro-360/validation";

export const MAX_CATALOG_IMAGE_BYTES = 5_242_880;

export type AllowedImageContentType = (typeof ALLOWED_IMAGE_CONTENT_TYPES)[number];

export function isAllowedImageContentType(value: string): value is AllowedImageContentType {
  return (ALLOWED_IMAGE_CONTENT_TYPES as readonly string[]).includes(value);
}

/** Detecta MIME real a partir dos magic bytes (primeiros bytes do arquivo). */
export function detectImageContentTypeFromBuffer(
  buffer: Uint8Array,
): AllowedImageContentType | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

/** Valida que o MIME declarado bate com o conteúdo real do arquivo. */
export function validateImageBuffer(
  buffer: Uint8Array,
  declaredContentType: string,
): { ok: true; contentType: AllowedImageContentType } | { ok: false } {
  if (!isAllowedImageContentType(declaredContentType)) return { ok: false };
  const detected = detectImageContentTypeFromBuffer(buffer);
  if (!detected || detected !== declaredContentType) return { ok: false };
  return { ok: true, contentType: detected };
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

/**
 * Aceita null (remover) ou URL sob o publicBase do storage com object key de catálogo.
 * Bloqueia URLs externas / javascript: / hosts arbitrários.
 */
export function isAllowedStoredProductImageUrl(
  imageUrl: string | null,
  publicBaseUrl: string | undefined,
): boolean {
  if (imageUrl === null) return true;
  const base = publicBaseUrl?.trim().replace(/\/$/, "");
  if (!base) return false;
  if (!imageUrl.startsWith(`${base}/`)) return false;
  const key = imageUrl.slice(base.length + 1);
  return isPublicCatalogObjectKey(key);
}
