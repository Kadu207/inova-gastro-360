import { describe, it, expect, beforeEach } from "vitest";
import { hitRateLimit, clearRateLimit, resetRateLimitStore } from "./rate-limit";

describe("rate-limit", () => {
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
    // após a janela
    expect(hitRateLimit(key, 1000 + 60_001, 10, 60_000).allowed).toBe(true);
  });

  it("clearRateLimit zera o contador", () => {
    const key = "login:1.2.3.4:user@x.com";
    for (let i = 0; i < 10; i++) hitRateLimit(key, 1000, 10, 60_000);
    clearRateLimit(key);
    expect(hitRateLimit(key, 1000, 10, 60_000).allowed).toBe(true);
  });
});
