import type { JwtPayload } from "@inova-gastro-360/auth";
import { jsonResponse } from "../lib";
import { getSql } from "./db";
import type { GatewayEnv } from "../types/env";

/** Papéis com permissão de gestão do catálogo (spec 015 — RBAC). */
const CATALOG_MANAGEMENT_ROLES = ["super_admin", "admin_cliente", "gestor_filial"];

export async function assertCatalogBranchAccess(
  env: GatewayEnv,
  user: JwtPayload,
  branchId: string,
): Promise<{ ok: true; tenantId: string } | { ok: false; response: Response }> {
  if (!CATALOG_MANAGEMENT_ROLES.includes(user.role)) {
    return { ok: false, response: jsonResponse({ error: "forbidden", message: "Permissão insuficiente" }, 403) };
  }
  const sql = getSql(env);
  try {
    const rows = await sql<{ tenant_id: string }[]>`
      SELECT tenant_id FROM branches
      WHERE id = ${branchId}::uuid AND is_active = true
      LIMIT 1
    `;
    const row = rows[0];
    if (!row || row.tenant_id !== user.tid) {
      return { ok: false, response: jsonResponse({ error: "forbidden" }, 403) };
    }
    if (user.branches.length > 0 && !user.branches.includes(branchId)) {
      return { ok: false, response: jsonResponse({ error: "forbidden" }, 403) };
    }
    return { ok: true, tenantId: row.tenant_id };
  } finally {
    await sql.end();
  }
}
