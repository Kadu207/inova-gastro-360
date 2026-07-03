import { describe, it, expect } from "vitest";
import { ConfigError, getJwtSecret, getInternalSecret, isOriginAllowed, parseAllowedOrigins } from "./config";
import type { GatewayEnv } from "../types/env";

describe("getJwtSecret", () => {
  it("retorna o secret quando válido", () => {
    const env = { JWT_SECRET: "a-secret-with-32-characters-total!" } as GatewayEnv;
    expect(getJwtSecret(env)).toBe("a-secret-with-32-characters-total!");
  });

  it("lança ConfigError quando ausente", () => {
    expect(() => getJwtSecret({} as GatewayEnv)).toThrow(ConfigError);
  });

  it("lança ConfigError quando muito curto", () => {
    expect(() => getJwtSecret({ JWT_SECRET: "curto" } as GatewayEnv)).toThrow(ConfigError);
  });
});

describe("getInternalSecret", () => {
  it("lança ConfigError quando ausente", () => {
    expect(() => getInternalSecret({} as GatewayEnv)).toThrow(ConfigError);
  });
});

describe("CORS origins", () => {
  it("parseia lista CSV", () => {
    const env = { CORS_ALLOWED_ORIGINS: "https://a.com, https://b.com" } as GatewayEnv;
    expect(parseAllowedOrigins(env)).toEqual(["https://a.com", "https://b.com"]);
  });

  it("permite origem na allowlist", () => {
    expect(isOriginAllowed("https://a.com", ["https://a.com"])).toBe(true);
  });

  it("bloqueia origem fora da allowlist", () => {
    expect(isOriginAllowed("https://evil.com", ["https://a.com"])).toBe(false);
  });

  it("sem allowlist permite apenas localhost", () => {
    expect(isOriginAllowed("http://localhost:3000", [])).toBe(true);
    expect(isOriginAllowed("http://127.0.0.1:8792", [])).toBe(true);
    expect(isOriginAllowed("https://prod.com", [])).toBe(false);
  });
});
