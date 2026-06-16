import { jsonResponse } from "../lib";
import { getSql } from "../lib/db";
import type { GatewayEnv } from "../types/env";

export async function handleCatalogCategories(
  request: Request,
  env: GatewayEnv,
  branchId: string,
): Promise<Response> {
  const sql = getSql(env);
  try {
    const rows = await sql`
      SELECT id, name, sort_order, is_active
      FROM product_categories
      WHERE branch_id = ${branchId}::uuid AND is_active = true
      ORDER BY sort_order ASC, name ASC
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
          SELECT p.id, p.name, p.description, p.price_cents, p.image_url, p.category_id, c.name as category_name
          FROM products p
          JOIN product_categories c ON c.id = p.category_id
          WHERE p.branch_id = ${branchId}::uuid AND p.is_available = true AND p.category_id = ${categoryId}::uuid
          ORDER BY p.name ASC
        `
      : await sql`
          SELECT p.id, p.name, p.description, p.price_cents, p.image_url, p.category_id, c.name as category_name
          FROM products p
          JOIN product_categories c ON c.id = p.category_id
          WHERE p.branch_id = ${branchId}::uuid AND p.is_available = true
          ORDER BY c.sort_order ASC, p.name ASC
        `;
    return jsonResponse({ products: rows });
  } finally {
    await sql.end();
  }
}
