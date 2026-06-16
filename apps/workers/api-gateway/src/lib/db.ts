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

/** Hyperdrive em produção; DATABASE_URL em dev local (.dev.vars) */
export function getDatabaseUrl(env: GatewayEnv): string | undefined {
  return env.HYPERDRIVE?.connectionString ?? env.DATABASE_URL;
}

export function hasDatabase(env: GatewayEnv): boolean {
  return Boolean(getDatabaseUrl(env));
}

export function getSql(env: GatewayEnv) {
  const url = getDatabaseUrl(env);
  if (!url) throw new Error("Banco não configurado (HYPERDRIVE ou DATABASE_URL)");
  return postgres(normalizeDatabaseUrl(url), { max: 1, prepare: false });
}
