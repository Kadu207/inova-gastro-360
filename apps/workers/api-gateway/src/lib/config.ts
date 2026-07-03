import type { GatewayEnv } from "../types/env";

/** Erro de configuração de ambiente — vira 500 server_misconfigured no router. */
export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

const MIN_SECRET_LENGTH = 16;

/**
 * Segredo JWT obrigatório. Sem fallback: se ausente ou fraco, lança ConfigError.
 * Único ponto de leitura de JWT_SECRET em toda a API.
 */
export function getJwtSecret(env: GatewayEnv): string {
  const secret = env.JWT_SECRET;
  if (!secret || secret.length < MIN_SECRET_LENGTH) {
    throw new ConfigError(
      "JWT_SECRET ausente ou muito curto (mínimo 16 caracteres). Configure a variável de ambiente.",
    );
  }
  return secret;
}

/** Segredo compartilhado entre workers para rotas internas. Obrigatório em produção. */
export function getInternalSecret(env: GatewayEnv): string {
  const secret = env.INTERNAL_SHARED_SECRET;
  if (!secret || secret.length < MIN_SECRET_LENGTH) {
    throw new ConfigError(
      "INTERNAL_SHARED_SECRET ausente ou muito curto (mínimo 16 caracteres).",
    );
  }
  return secret;
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
