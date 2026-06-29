import type { JwtPayload } from "@inova-gastro-360/auth";
import { PresignInputSchema } from "@inova-gastro-360/validation";
import { jsonResponse } from "../lib";
import { writeCatalogAuditLog } from "../lib/audit-log";
import { assertCatalogBranchAccess } from "../lib/catalog-access";
import { getSql } from "../lib/db";
import {
  isAllowedImageContentType,
  MAX_CATALOG_IMAGE_BYTES,
} from "../lib/storage/image-policy";
import { presignProductImageUpload, uploadProductImage } from "../lib/storage/s3-client";
import type { GatewayEnv } from "../types/env";

async function parseJsonBody(request: Request): Promise<unknown | null> {
  try {
    const text = await request.text();
    if (!text.trim()) return null;
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

async function assertProductAccess(
  env: GatewayEnv,
  user: JwtPayload,
  branchId: string,
  productId: string,
): Promise<
  | { ok: true; tenantId: string; productId: string }
  | { ok: false; response: Response }
> {
  const access = await assertCatalogBranchAccess(env, user, branchId);
  if (!access.ok) return access;

  const sql = getSql(env);
  try {
    const rows = await sql<{ id: string }[]>`
      SELECT id FROM products
      WHERE id = ${productId}::uuid
        AND tenant_id = ${access.tenantId}::uuid
        AND branch_id = ${branchId}::uuid
      LIMIT 1
    `;
    if (!rows[0]) {
      return { ok: false, response: jsonResponse({ error: "not_found" }, 404) };
    }
    return { ok: true, tenantId: access.tenantId, productId };
  } finally {
    await sql.end();
  }
}

export async function handleAdminPresignProductImage(
  request: Request,
  env: GatewayEnv,
  user: JwtPayload,
  branchId: string,
  productId: string,
): Promise<Response> {
  const access = await assertProductAccess(env, user, branchId, productId);
  if (!access.ok) return access.response;

  const parsed = PresignInputSchema.safeParse(await parseJsonBody(request));
  if (!parsed.success) {
    return jsonResponse({ error: "validation_error", details: parsed.error.flatten() }, 400);
  }

  const presigned = await presignProductImageUpload(env, {
    tenantId: access.tenantId,
    branchId,
    productId: access.productId,
    contentType: parsed.data.contentType,
  });

  if (!presigned) {
    return jsonResponse({ error: "storage_not_configured" }, 503);
  }

  if (!presigned.objectKey.includes(access.tenantId)) {
    return jsonResponse({ error: "invalid_image" }, 400);
  }

  return jsonResponse({
    uploadUrl: presigned.uploadUrl,
    publicUrl: presigned.publicUrl,
    method: presigned.method,
    headers: presigned.headers,
  });
}

export async function handleAdminUploadProductImage(
  request: Request,
  env: GatewayEnv,
  user: JwtPayload,
  branchId: string,
  productId: string,
): Promise<Response> {
  const access = await assertProductAccess(env, user, branchId, productId);
  if (!access.ok) return access.response;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonResponse({ error: "invalid_multipart" }, 400);
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return jsonResponse({ error: "invalid_image", message: "Arquivo obrigatório" }, 400);
  }

  if (file.size > MAX_CATALOG_IMAGE_BYTES) {
    return jsonResponse({ error: "invalid_image", message: "Arquivo acima de 5MB" }, 400);
  }

  const contentType = file.type || "application/octet-stream";
  if (!isAllowedImageContentType(contentType)) {
    return jsonResponse({ error: "invalid_image", message: "MIME não permitido" }, 400);
  }

  const buffer = new Uint8Array(await file.arrayBuffer());
  const uploaded = await uploadProductImage(env, {
    tenantId: access.tenantId,
    branchId,
    productId: access.productId,
    contentType,
    body: buffer,
  });

  if (!uploaded) {
    return jsonResponse({ error: "storage_not_configured" }, 503);
  }

  const sql = getSql(env);
  try {
    const rows = await sql<
      {
        id: string;
        name: string;
        description: string | null;
        price_cents: number;
        image_url: string | null;
        category_id: string;
        is_available: boolean;
      }[]
    >`
      UPDATE products SET image_url = ${uploaded.publicUrl}, updated_at = NOW()
      WHERE id = ${productId}::uuid AND tenant_id = ${access.tenantId}::uuid
      RETURNING id, name, description, price_cents, image_url, category_id, is_available
    `;
    const updated = rows[0];
    const [category] = await sql<{ name: string }[]>`
      SELECT name FROM product_categories WHERE id = ${updated.category_id}::uuid LIMIT 1
    `;
    await writeCatalogAuditLog(env, {
      tenantId: access.tenantId,
      userId: user.sub,
      action: "catalog.product.image_upload",
      resource: `product:${productId}`,
      metadata: { branchId, publicUrl: uploaded.publicUrl },
    });
    return jsonResponse({
      publicUrl: uploaded.publicUrl,
      product: { ...updated, category_name: category?.name ?? "" },
    });
  } finally {
    await sql.end();
  }
}
