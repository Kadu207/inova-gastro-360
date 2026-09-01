import { assertUsableSecret } from "@inova-gastro-360/runtime-node";
import type { GatewayEnv } from "../types/env";

/** Erro de configuração de ambiente — vira 500 server_misconfigured no router. */
export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

/**
 * Segredo JWT obrigatório. Sem fallback: se ausente, fraco ou placeholder, lança ConfigError.
 * Único ponto de leitura de JWT_SECRET em toda a API.
 */
export function getJwtSecret(env: GatewayEnv): string {
  try {
    return assertUsableSecret(env.JWT_SECRET, "JWT_SECRET");
  } catch (err) {
    throw new ConfigError(err instanceof Error ? err.message : "JWT_SECRET inválido");
  }
}

/** Segredo compartilhado entre workers para rotas internas. Obrigatório e não-placeholder. */
export function getInternalSecret(env: GatewayEnv): string {
  try {
    return assertUsableSecret(env.INTERNAL_SHARED_SECRET, "INTERNAL_SHARED_SECRET");
  } catch (err) {
    throw new ConfigError(err instanceof Error ? err.message : "INTERNAL_SHARED_SECRET inválido");
  }
}

/** Origem local de desenvolvimento (localhost/127.0.0.1 em qualquer porta). */
function isLocalOrigin(origin: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

export function parseAllowedOrigins(env: GatewayEnv): string[] {
  return (env.CORS_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

/**
 * Decide se a origem é permitida. Sem allowlist configurada, apenas origens
 * locais são aceitas (conveniência de dev) — nunca `*` para credenciais.
 */
export function isOriginAllowed(origin: string, allowed: string[]): boolean {
  if (allowed.includes(origin)) return true;
  if (allowed.length === 0) return isLocalOrigin(origin);
  return false;
}
