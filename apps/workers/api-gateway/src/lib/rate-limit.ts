/**
 * Rate limiter in-memory por janela deslizante. Adequado ao runtime VPS
 * (1 processo por container). Para múltiplas réplicas, trocar o store por Redis
 * mantendo esta interface.
 */

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

interface Attempt {
  count: number;
  resetAt: number;
}

const store = new Map<string, Attempt>();

const DEFAULT_MAX = 10;
const DEFAULT_WINDOW_MS = 15 * 60 * 1000;

/** Registra uma tentativa e informa se ainda é permitida. */
export function hitRateLimit(
  key: string,
  now: number = Date.now(),
  max: number = DEFAULT_MAX,
  windowMs: number = DEFAULT_WINDOW_MS,
): RateLimitResult {
  const existing = store.get(key);

  if (!existing || existing.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: max - 1, retryAfterSeconds: 0 };
  }

  if (existing.count >= max) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000),
    };
  }

  existing.count += 1;
  return { allowed: true, remaining: max - existing.count, retryAfterSeconds: 0 };
}

/** Limpa o contador de uma chave (ex.: após login bem-sucedido). */
export function clearRateLimit(key: string): void {
  store.delete(key);
}

/** Apenas para testes: zera todo o store. */
export function resetRateLimitStore(): void {
  store.clear();
}
