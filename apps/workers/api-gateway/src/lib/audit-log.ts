import type { JSONValue } from "postgres";
import type { GatewayEnv } from "../types/env";
import { getSql, hasDatabase, setTenantContext } from "./db";

export type CatalogAuditAction =
  | "catalog.category.create"
  | "catalog.category.update"
  | "catalog.category.delete"
  | "catalog.product.create"
  | "catalog.product.update"
  | "catalog.product.delete"
  | "catalog.product.image_upload";

type SqlClient = ReturnType<typeof getSql>;

/** Auditoria com conexão já aberta (não fecha o client). */
export async function writeAuditLog(
  sql: SqlClient,
  params: {
    tenantId: string;
    userId: string;
    action: string;
    resource: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  try {
    await sql`
      INSERT INTO audit_logs (id, tenant_id, user_id, action, resource, metadata)
      VALUES (
        gen_random_uuid(),
        ${params.tenantId}::uuid,
        ${params.userId}::uuid,
        ${params.action},
        ${params.resource},
        ${params.metadata ? sql.json(params.metadata as JSONValue) : null}
      )
    `;
  } catch {
    // best-effort
  }
}

/** Auditoria best-effort — falhas não propagam para o handler principal. */
export async function writeCatalogAuditLog(
  env: GatewayEnv,
  params: {
    tenantId: string;
    userId: string;
    action: CatalogAuditAction;
    resource: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  if (!hasDatabase(env)) return;

  const sql = getSql(env);
  try {
    await setTenantContext(sql, params.tenantId);
    await writeAuditLog(sql, params);
  } catch {
    // best-effort
  } finally {
    await sql.end();
  }
}
