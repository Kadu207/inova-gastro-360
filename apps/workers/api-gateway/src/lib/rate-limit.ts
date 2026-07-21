/**
 * Rate limiter — memória (default) ou Redis quando REDIS_URL / client configurado.
 * Adequado a múltiplas réplicas no VPS (spec 016).
 */

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/** Subconjunto mínimo do cliente Redis (node-redis v4). */
export interface RateLimitRedis {
  incr(key: string): Promise<number>;
  pExpire(key: string, ms: number): Promise<boolean>;
  pTTL(key: string): Promise<number>;
  del(key: string): Promise<number>;
}

interface Attempt {
  count: number;
  resetAt: number;
}

const store = new Map<string, Attempt>();

const DEFAULT_MAX = 10;
const DEFAULT_WINDOW_MS = 15 * 60 * 1000;
const REDIS_PREFIX = "rl:";

let redisClient: RateLimitRedis | null = null;

/** Configura store Redis (Node/VPS). Em Workers/CF permanece in-memory. */
export function configureRateLimitRedis(client: RateLimitRedis | null): void {
  redisClient = client;
}

export function getConfiguredRateLimitRedis(): RateLimitRedis | null {
  return redisClient;
}

/** Registra uma tentativa e informa se ainda é permitida (in-memory). */
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

async function hitRateLimitRedis(
  client: RateLimitRedis,
  key: string,
  max: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const redisKey = `${REDIS_PREFIX}${key}`;
  const count = await client.incr(redisKey);
  if (count === 1) {
    await client.pExpire(redisKey, windowMs);
  }
  const ttlMs = await client.pTTL(redisKey);
  const retryAfterSeconds = ttlMs > 0 ? Math.ceil(ttlMs / 1000) : Math.ceil(windowMs / 1000);

  if (count > max) {
    return { allowed: false, remaining: 0, retryAfterSeconds };
  }
  return { allowed: true, remaining: Math.max(0, max - count), retryAfterSeconds: 0 };
}

/**
 * Preferir Redis se configurado; senão memória (compatível com CF Workers / testes).
 */
export async function hitRateLimitAsync(
  key: string,
  now: number = Date.now(),
  max: number = DEFAULT_MAX,
  windowMs: number = DEFAULT_WINDOW_MS,
  client: RateLimitRedis | null = redisClient,
): Promise<RateLimitResult> {
  if (client) {
    try {
      return await hitRateLimitRedis(client, key, max, windowMs);
    } catch {
      /* fallback memória se Redis cair */
    }
  }
  return hitRateLimit(key, now, max, windowMs);
}

/** Limpa o contador de uma chave (ex.: após login bem-sucedido). */
export function clearRateLimit(key: string): void {
  store.delete(key);
}

export async function clearRateLimitAsync(
  key: string,
  client: RateLimitRedis | null = redisClient,
): Promise<void> {
  store.delete(key);
  if (client) {
    try {
      await client.del(`${REDIS_PREFIX}${key}`);
    } catch {
      /* ignore */
    }
  }
}

/** Apenas para testes: zera todo o store. */
export function resetRateLimitStore(): void {
  store.clear();
  redisClient = null;
}
