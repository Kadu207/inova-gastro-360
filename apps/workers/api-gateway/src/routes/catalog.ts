import { jsonResponse } from "../lib";
import { getSql } from "../lib/db";
import type { GatewayEnv } from "../types/env";

/** GET público — defense in depth: branch ativa + tenant_id alinhado via join. */
export async function handleCatalogCategories(
  _request: Request,
  env: GatewayEnv,
  branchId: string,
): Promise<Response> {
  const sql = getSql(env);
  try {
    const rows = await sql`
      SELECT pc.id, pc.name, pc.sort_order, pc.is_active
      FROM product_categories pc
      INNER JOIN branches br ON br.id = pc.branch_id AND br.tenant_id = pc.tenant_id
      WHERE pc.branch_id = ${branchId}::uuid
        AND pc.is_active = true
        AND br.is_active = true
      ORDER BY pc.sort_order ASC, pc.name ASC
    `;
    return jsonResponse({ categories: rows });
  } finally {
    await sql.end();
  }
}

export async function handleCatalogProducts(
  request: Request,
  env: GatewayEnv,
  branchId: string,
): Promise<Response> {
  const url = new URL(request.url);
  const categoryId = url.searchParams.get("categoryId");
  const sql = getSql(env);
  try {
    const rows = categoryId
      ? await sql`
          SELECT p.id, p.name, p.description, p.price_cents, p.image_url, p.category_id, c.name AS category_name
          FROM products p
          INNER JOIN product_categories c ON c.id = p.category_id AND c.tenant_id = p.tenant_id
          INNER JOIN branches br ON br.id = p.branch_id AND br.tenant_id = p.tenant_id
          WHERE p.branch_id = ${branchId}::uuid
            AND p.is_available = true
            AND c.is_active = true
            AND br.is_active = true
            AND p.category_id = ${categoryId}::uuid
          ORDER BY p.name ASC
        `
      : await sql`
          SELECT p.id, p.name, p.description, p.price_cents, p.image_url, p.category_id, c.name AS category_name
          FROM products p
          INNER JOIN product_categories c ON c.id = p.category_id AND c.tenant_id = p.tenant_id
          INNER JOIN branches br ON br.id = p.branch_id AND br.tenant_id = p.tenant_id
          WHERE p.branch_id = ${branchId}::uuid
            AND p.is_available = true
            AND c.is_active = true
            AND br.is_active = true
          ORDER BY c.sort_order ASC, p.name ASC
        `;
    return jsonResponse({ products: rows });
  } finally {
    await sql.end();
  }
}
