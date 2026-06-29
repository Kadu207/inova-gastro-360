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
