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

export type LgpdAuditAction =
  | "lgpd.consent.recorded"
  | "lgpd.export.requested"
  | "lgpd.erasure.requested"
  | "lgpd.erasure.status_changed";

type SqlClient = ReturnType<typeof getSql>;

/** Auditoria com conexão já aberta (não fecha o client). userId ausente = ator anônimo/sistema. */
export async function writeAuditLog(
  sql: SqlClient,
  params: {
    tenantId: string;
    userId?: string | null;
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
        ${params.userId ? sql`${params.userId}::uuid` : null},
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

/** Auditoria LGPD — consentimento, exportação de dados e direito ao esquecimento. */
export async function writeLgpdAuditLog(
  env: GatewayEnv,
  params: {
    tenantId: string;
    userId?: string | null;
    action: LgpdAuditAction;
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
