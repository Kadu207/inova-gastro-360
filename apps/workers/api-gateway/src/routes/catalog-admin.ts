import type { JwtPayload } from "@inova-gastro-360/auth";
import {
  CategoryInputSchema,
  CategoryPatchSchema,
  ProductInputSchema,
  ProductPatchSchema,
} from "@inova-gastro-360/validation";
import { jsonResponse, parseJsonBody } from "../lib";
import { writeCatalogAuditLog } from "../lib/audit-log";
import { assertCatalogBranchAccess } from "../lib/catalog-access";
import { getSql, setTenantContext } from "../lib/db";
import { isAllowedStoredProductImageUrl } from "../lib/storage/image-policy";
import type { GatewayEnv } from "../types/env";

type ProductRow = {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  image_url: string | null;
  category_id: string;
  category_name: string;
  is_available: boolean;
};

export async function handleAdminListCategories(
  request: Request,
  env: GatewayEnv,
  user: JwtPayload,
  branchId: string,
): Promise<Response> {
  const access = await assertCatalogBranchAccess(env, user, branchId);
  if (!access.ok) return access.response;

  const includeInactive = new URL(request.url).searchParams.get("includeInactive") === "1";
  const sql = getSql(env);
  try {
    await setTenantContext(sql, user.tid);
    const rows = includeInactive
      ? await sql`
          SELECT id, name, sort_order, is_active, created_at, updated_at
          FROM product_categories
          WHERE tenant_id = ${access.tenantId}::uuid AND branch_id = ${branchId}::uuid
          ORDER BY sort_order ASC, name ASC
        `
      : await sql`
          SELECT id, name, sort_order, is_active, created_at, updated_at
          FROM product_categories
          WHERE tenant_id = ${access.tenantId}::uuid AND branch_id = ${branchId}::uuid AND is_active = true
          ORDER BY sort_order ASC, name ASC
        `;
    return jsonResponse({ categories: rows });
  } finally {
    await sql.end();
  }
}

export async function handleAdminCreateCategory(
  request: Request,
  env: GatewayEnv,
  user: JwtPayload,
  branchId: string,
): Promise<Response> {
  const access = await assertCatalogBranchAccess(env, user, branchId);
  if (!access.ok) return access.response;

  const parsed = CategoryInputSchema.safeParse(await parseJsonBody(request));
  if (!parsed.success) {
    return jsonResponse({ error: "validation_error", details: parsed.error.flatten() }, 400);
  }

  const sql = getSql(env);
  try {
    await setTenantContext(sql, user.tid);
    const rows = await sql<
      { id: string; name: string; sort_order: number; is_active: boolean }[]
    >`
      INSERT INTO product_categories (id, tenant_id, branch_id, name, sort_order, is_active, updated_at)
      VALUES (
        gen_random_uuid(),
        ${access.tenantId}::uuid,
        ${branchId}::uuid,
        ${parsed.data.name},
        ${parsed.data.sortOrder},
        ${parsed.data.isActive},
        NOW()
      )
      RETURNING id, name, sort_order, is_active
    `;
    const category = rows[0];
    await writeCatalogAuditLog(env, {
      tenantId: access.tenantId,
      userId: user.sub,
      action: "catalog.category.create",
      resource: `product_category:${category.id}`,
      metadata: { branchId, name: category.name },
    });
    return jsonResponse({ category }, 201);
  } finally {
    await sql.end();
  }
}

export async function handleAdminUpdateCategory(
  request: Request,
  env: GatewayEnv,
  user: JwtPayload,
  branchId: string,
  categoryId: string,
): Promise<Response> {
  const access = await assertCatalogBranchAccess(env, user, branchId);
  if (!access.ok) return access.response;

  const parsed = CategoryPatchSchema.safeParse(await parseJsonBody(request));
  if (!parsed.success) {
    return jsonResponse({ error: "validation_error", details: parsed.error.flatten() }, 400);
  }

  const { name, sortOrder, isActive } = parsed.data;
  const sql = getSql(env);
  try {
    await setTenantContext(sql, user.tid);
    const existing = await sql<{ id: string }[]>`
      SELECT id FROM product_categories
      WHERE id = ${categoryId}::uuid AND tenant_id = ${access.tenantId}::uuid AND branch_id = ${branchId}::uuid
      LIMIT 1
    `;
    if (!existing[0]) return jsonResponse({ error: "not_found" }, 404);

    const rows = await sql<
      { id: string; name: string; sort_order: number; is_active: boolean }[]
    >`
      UPDATE product_categories SET
        name = COALESCE(${name ?? null}, name),
        sort_order = COALESCE(${sortOrder ?? null}, sort_order),
        is_active = COALESCE(${isActive ?? null}, is_active),
        updated_at = NOW()
      WHERE id = ${categoryId}::uuid AND tenant_id = ${access.tenantId}::uuid
      RETURNING id, name, sort_order, is_active
    `;
    const category = rows[0];
    await writeCatalogAuditLog(env, {
      tenantId: access.tenantId,
      userId: user.sub,
      action: "catalog.category.update",
      resource: `product_category:${categoryId}`,
      metadata: { branchId },
    });
    return jsonResponse({ category });
  } finally {
    await sql.end();
  }
}

export async function handleAdminDeleteCategory(
  env: GatewayEnv,
  user: JwtPayload,
  branchId: string,
  categoryId: string,
): Promise<Response> {
  const access = await assertCatalogBranchAccess(env, user, branchId);
  if (!access.ok) return access.response;

  const sql = getSql(env);
  try {
    await setTenantContext(sql, user.tid);
    const [{ count }] = await sql<{ count: number }[]>`
      SELECT COUNT(*)::int AS count FROM products
      WHERE category_id = ${categoryId}::uuid AND tenant_id = ${access.tenantId}::uuid
    `;
    if ((count ?? 0) > 0) {
      return jsonResponse({ error: "category_has_products" }, 409);
    }

    const deleted = await sql<{ id: string }[]>`
      DELETE FROM product_categories
      WHERE id = ${categoryId}::uuid AND tenant_id = ${access.tenantId}::uuid AND branch_id = ${branchId}::uuid
      RETURNING id
    `;
    if (!deleted[0]) return jsonResponse({ error: "not_found" }, 404);
    await writeCatalogAuditLog(env, {
      tenantId: access.tenantId,
      userId: user.sub,
      action: "catalog.category.delete",
      resource: `product_category:${categoryId}`,
      metadata: { branchId },
    });
    return jsonResponse({ ok: true });
  } finally {
    await sql.end();
  }
}

async function categoryBelongsToBranch(
  sql: ReturnType<typeof getSql>,
  tenantId: string,
  branchId: string,
  categoryId: string,
): Promise<boolean> {
  const rows = await sql<{ id: string }[]>`
    SELECT id FROM product_categories
    WHERE id = ${categoryId}::uuid AND tenant_id = ${tenantId}::uuid AND branch_id = ${branchId}::uuid
    LIMIT 1
  `;
  return Boolean(rows[0]);
}

async function findAdminProduct(
  sql: ReturnType<typeof getSql>,
  tenantId: string,
  branchId: string,
  productId: string,
): Promise<ProductRow | null> {
  const rows = await sql<ProductRow[]>`
    SELECT
      p.id, p.name, p.description, p.price_cents, p.image_url,
      p.category_id, c.name AS category_name, p.is_available
    FROM products p
    JOIN product_categories c ON c.id = p.category_id
    WHERE p.id = ${productId}::uuid
      AND p.tenant_id = ${tenantId}::uuid
      AND p.branch_id = ${branchId}::uuid
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function handleAdminListProducts(
  request: Request,
  env: GatewayEnv,
  user: JwtPayload,
  branchId: string,
): Promise<Response> {
  const access = await assertCatalogBranchAccess(env, user, branchId);
  if (!access.ok) return access.response;

  const includeUnavailable = new URL(request.url).searchParams.get("includeUnavailable") === "1";
  const sql = getSql(env);
  try {
    await setTenantContext(sql, user.tid);
    const rows = includeUnavailable
      ? await sql<ProductRow[]>`
          SELECT
            p.id, p.name, p.description, p.price_cents, p.image_url,
            p.category_id, c.name AS category_name, p.is_available
          FROM products p
          JOIN product_categories c ON c.id = p.category_id
          WHERE p.tenant_id = ${access.tenantId}::uuid AND p.branch_id = ${branchId}::uuid
          ORDER BY c.sort_order ASC, p.name ASC
        `
      : await sql<ProductRow[]>`
          SELECT
            p.id, p.name, p.description, p.price_cents, p.image_url,
            p.category_id, c.name AS category_name, p.is_available
          FROM products p
          JOIN product_categories c ON c.id = p.category_id
          WHERE p.tenant_id = ${access.tenantId}::uuid
            AND p.branch_id = ${branchId}::uuid
            AND p.is_available = true
          ORDER BY c.sort_order ASC, p.name ASC
        `;
    return jsonResponse({ products: rows });
  } finally {
    await sql.end();
  }
}

export async function handleAdminCreateProduct(
  request: Request,
  env: GatewayEnv,
  user: JwtPayload,
  branchId: string,
): Promise<Response> {
  const access = await assertCatalogBranchAccess(env, user, branchId);
  if (!access.ok) return access.response;

  const parsed = ProductInputSchema.safeParse(await parseJsonBody(request));
  if (!parsed.success) {
    return jsonResponse({ error: "validation_error", details: parsed.error.flatten() }, 400);
  }

  const sql = getSql(env);
  try {
    await setTenantContext(sql, user.tid);
    if (!(await categoryBelongsToBranch(sql, access.tenantId, branchId, parsed.data.categoryId))) {
      return jsonResponse({ error: "not_found", field: "categoryId" }, 404);
    }

    const rows = await sql<ProductRow[]>`
      INSERT INTO products (
        id, tenant_id, branch_id, category_id, name, description, price_cents, is_available, updated_at
      )
      VALUES (
        gen_random_uuid(),
        ${access.tenantId}::uuid,
        ${branchId}::uuid,
        ${parsed.data.categoryId}::uuid,
        ${parsed.data.name},
        ${parsed.data.description ?? null},
        ${parsed.data.priceCents},
        ${parsed.data.isAvailable},
        NOW()
      )
      RETURNING id, name, description, price_cents, image_url, category_id, is_available
    `;
    const created = rows[0];
    const [category] = await sql<{ name: string }[]>`
      SELECT name FROM product_categories WHERE id = ${created.category_id}::uuid LIMIT 1
    `;
    const product = { ...created, category_name: category?.name ?? "" };
    await writeCatalogAuditLog(env, {
      tenantId: access.tenantId,
      userId: user.sub,
      action: "catalog.product.create",
      resource: `product:${created.id}`,
      metadata: { branchId, name: created.name },
    });
    return jsonResponse({ product }, 201);
  } finally {
    await sql.end();
  }
}

export async function handleAdminUpdateProduct(
  request: Request,
  env: GatewayEnv,
  user: JwtPayload,
  branchId: string,
  productId: string,
): Promise<Response> {
  const access = await assertCatalogBranchAccess(env, user, branchId);
  if (!access.ok) return access.response;

  const parsed = ProductPatchSchema.safeParse(await parseJsonBody(request));
  if (!parsed.success) {
    return jsonResponse({ error: "validation_error", details: parsed.error.flatten() }, 400);
  }

  const { categoryId, name, description, priceCents, isAvailable, imageUrl } = parsed.data;

  if (imageUrl !== undefined && imageUrl !== null) {
    if (
      !isAllowedStoredProductImageUrl(imageUrl, env.S3_PUBLIC_BASE_URL, {
        tenantId: access.tenantId,
        branchId,
        productId,
      })
    ) {
      return jsonResponse(
        { error: "validation_error", message: "imageUrl deve ser URL do storage do produto" },
        400,
      );
    }
  }

  const sql = getSql(env);
  try {
    await setTenantContext(sql, user.tid);
    const existing = await findAdminProduct(sql, access.tenantId, branchId, productId);
    if (!existing) return jsonResponse({ error: "not_found" }, 404);

    if (categoryId && !(await categoryBelongsToBranch(sql, access.tenantId, branchId, categoryId))) {
      return jsonResponse({ error: "not_found", field: "categoryId" }, 404);
    }

    const nextCategoryId = categoryId ?? existing.category_id;
    const nextName = name ?? existing.name;
    const nextDescription = description !== undefined ? description : existing.description;
    const nextPriceCents = priceCents ?? existing.price_cents;
    const nextAvailable = isAvailable ?? existing.is_available;
    const nextImageUrl = imageUrl !== undefined ? imageUrl : existing.image_url;

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
      UPDATE products SET
        category_id = ${nextCategoryId}::uuid,
        name = ${nextName},
        description = ${nextDescription},
        price_cents = ${nextPriceCents},
        is_available = ${nextAvailable},
        image_url = ${nextImageUrl},
        updated_at = NOW()
      WHERE id = ${productId}::uuid AND tenant_id = ${access.tenantId}::uuid
      RETURNING id, name, description, price_cents, image_url, category_id, is_available
    `;
    const updated = rows[0];
    const [category] = await sql<{ name: string }[]>`
      SELECT name FROM product_categories WHERE id = ${updated.category_id}::uuid LIMIT 1
    `;
    const product = { ...updated, category_name: category?.name ?? "" };
    await writeCatalogAuditLog(env, {
      tenantId: access.tenantId,
      userId: user.sub,
      action: "catalog.product.update",
      resource: `product:${productId}`,
      metadata: {
        branchId,
        ...(imageUrl === null ? { imageRemoved: true } : {}),
      },
    });
    return jsonResponse({ product });
  } finally {
    await sql.end();
  }
}

export async function handleAdminDeleteProduct(
  env: GatewayEnv,
  user: JwtPayload,
  branchId: string,
  productId: string,
): Promise<Response> {
  const access = await assertCatalogBranchAccess(env, user, branchId);
  if (!access.ok) return access.response;

  const sql = getSql(env);
  try {
    await setTenantContext(sql, user.tid);
    const existing = await findAdminProduct(sql, access.tenantId, branchId, productId);
    if (!existing) return jsonResponse({ error: "not_found" }, 404);

    const [{ count }] = await sql<{ count: number }[]>`
      SELECT COUNT(*)::int AS count FROM order_items
      WHERE product_id = ${productId}::uuid AND tenant_id = ${access.tenantId}::uuid
    `;
    if ((count ?? 0) > 0) {
      return jsonResponse({ error: "product_has_orders" }, 409);
    }

    await sql`
      DELETE FROM products
      WHERE id = ${productId}::uuid AND tenant_id = ${access.tenantId}::uuid AND branch_id = ${branchId}::uuid
    `;
    await writeCatalogAuditLog(env, {
      tenantId: access.tenantId,
      userId: user.sub,
      action: "catalog.product.delete",
      resource: `product:${productId}`,
      metadata: { branchId, name: existing.name },
    });
    return jsonResponse({ ok: true });
  } finally {
    await sql.end();
  }
}
