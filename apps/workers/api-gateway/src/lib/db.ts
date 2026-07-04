import postgres from "postgres";
import type { GatewayEnv } from "../types/env";

/** Remove parâmetros de query do Prisma (?schema=public) incompatíveis com postgres.js */
export function normalizeDatabaseUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete("schema");
    const normalized = parsed.toString();
    return normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
  } catch {
    return url.replace(/[?&]schema=[^&]*/g, "").replace(/\?$/, "");
  }
}

/** Dev local (.dev.vars) tem prioridade; produção usa Hyperdrive binding. */
export function getDatabaseUrl(env: GatewayEnv): string | undefined {
  return env.DATABASE_URL ?? env.HYPERDRIVE?.connectionString;
}

export function hasDatabase(env: GatewayEnv): boolean {
  return Boolean(getDatabaseUrl(env));
}

export function getSql(env: GatewayEnv) {
  const url = getDatabaseUrl(env);
  if (!url) throw new Error("Banco não configurado (HYPERDRIVE ou DATABASE_URL)");
  const options: Parameters<typeof postgres>[1] = { max: 1, prepare: false };
  if (env.DATABASE_SSL_INSECURE === "1" || env.DATABASE_SSL_INSECURE === "true") {
    options.ssl = { rejectUnauthorized: false };
  }
  return postgres(normalizeDatabaseUrl(url), options);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Executa `fn` dentro de uma transação com o contexto de tenant definido
 * (`app.current_tenant_id`), ativando o isolamento RLS. `tenantId` é validado
 * como UUID e passado por parâmetro (set_config), sem interpolação de string.
 */
export async function withTenant<T>(
  sql: ReturnType<typeof getSql>,
  tenantId: string,
  fn: (tx: ReturnType<typeof getSql>) => Promise<T>,
): Promise<T> {
  if (!UUID_RE.test(tenantId)) {
    throw new Error("tenantId inválido para contexto RLS");
  }
  return sql.begin(async (tx) => {
    await tx`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;
    return fn(tx as unknown as ReturnType<typeof getSql>);
  }) as Promise<T>;
}

/** Define contexto RLS na sessão postgres.js (mesma conexão até sql.end()). */
export async function setTenantContext(
  sql: ReturnType<typeof getSql>,
  tenantId: string,
): Promise<void> {
  if (!UUID_RE.test(tenantId)) {
    throw new Error("tenantId inválido para contexto RLS");
  }
  // is_local=false — persiste na sessão (max:1 por handler). true só vale na txn atual.
  await sql`SELECT set_config('app.current_tenant_id', ${tenantId}, false)`;
}

/**
 * Abre conexão, executa `fn` com contexto RLS do tenant e encerra a conexão.
 * Preferir em handlers que fazem apenas operações tenant-scoped.
 */
export async function runWithTenant<T>(
  env: GatewayEnv,
  tenantId: string,
  fn: (tx: ReturnType<typeof getSql>) => Promise<T>,
): Promise<T> {
  const sql = getSql(env);
  try {
    return await withTenant(sql, tenantId, fn);
  } finally {
    await sql.end();
  }
}
