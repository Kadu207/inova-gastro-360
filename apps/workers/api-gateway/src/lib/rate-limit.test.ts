import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  hitRateLimit,
  hitRateLimitAsync,
  clearRateLimit,
  clearRateLimitAsync,
  resetRateLimitStore,
  configureRateLimitRedis,
  type RateLimitRedis,
} from "./rate-limit";

function mockRedis(): RateLimitRedis & { data: Map<string, { count: number; expireAt: number }> } {
  const data = new Map<string, { count: number; expireAt: number }>();
  return {
    data,
    async incr(key: string) {
      const now = Date.now();
      const cur = data.get(key);
      if (!cur || cur.expireAt <= now) {
        data.set(key, { count: 1, expireAt: now + 60_000 });
        return 1;
      }
      cur.count += 1;
      return cur.count;
    },
    async pExpire(key: string, ms: number) {
      const cur = data.get(key);
      if (cur) cur.expireAt = Date.now() + ms;
      return true;
    },
    async pTTL(key: string) {
      const cur = data.get(key);
      if (!cur) return -2;
      return Math.max(0, cur.expireAt - Date.now());
    },
    async del(key: string) {
      return data.delete(key) ? 1 : 0;
    },
  };
}

describe("rate-limit memory", () => {
  beforeEach(() => resetRateLimitStore());

  it("permite até o limite e bloqueia depois", () => {
    const key = "login:1.2.3.4:user@x.com";
    const now = 1000;
    for (let i = 0; i < 10; i++) {
      expect(hitRateLimit(key, now, 10, 60_000).allowed).toBe(true);
    }
    const blocked = hitRateLimit(key, now, 10, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("reinicia após a janela expirar", () => {
    const key = "login:1.2.3.4:user@x.com";
    for (let i = 0; i < 10; i++) hitRateLimit(key, 1000, 10, 60_000);
    expect(hitRateLimit(key, 1000, 10, 60_000).allowed).toBe(false);
    expect(hitRateLimit(key, 1000 + 60_001, 10, 60_000).allowed).toBe(true);
  });

  it("clearRateLimit zera o contador", () => {
    const key = "login:1.2.3.4:user@x.com";
    for (let i = 0; i < 10; i++) hitRateLimit(key, 1000, 10, 60_000);
    clearRateLimit(key);
    expect(hitRateLimit(key, 1000, 10, 60_000).allowed).toBe(true);
  });
});

describe("rate-limit redis", () => {
  beforeEach(() => resetRateLimitStore());

  it("hitRateLimitAsync usa Redis quando configurado", async () => {
    const redis = mockRedis();
    configureRateLimitRedis(redis);
    const key = "login:redis:user@x.com";
    for (let i = 0; i < 10; i++) {
      expect((await hitRateLimitAsync(key, Date.now(), 10, 60_000)).allowed).toBe(true);
    }
    const blocked = await hitRateLimitAsync(key, Date.now(), 10, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(redis.data.size).toBeGreaterThan(0);
  });

  it("clearRateLimitAsync remove chave Redis", async () => {
    const redis = mockRedis();
    configureRateLimitRedis(redis);
    const key = "login:redis:clear";
    await hitRateLimitAsync(key, Date.now(), 10, 60_000);
    await clearRateLimitAsync(key);
    expect(redis.data.size).toBe(0);
  });

  it("fallback memória se Redis falhar", async () => {
    const bad: RateLimitRedis = {
      incr: vi.fn(async () => {
        throw new Error("redis down");
      }),
      pExpire: vi.fn(async () => true),
      pTTL: vi.fn(async () => 1000),
      del: vi.fn(async () => 0),
    };
    configureRateLimitRedis(bad);
    const r = await hitRateLimitAsync("k", 1000, 10, 60_000);
    expect(r.allowed).toBe(true);
  });
});
