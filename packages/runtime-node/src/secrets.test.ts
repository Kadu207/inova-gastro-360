import { describe, it, expect } from "vitest";
import {
  assertUsableSecret,
  isInternalRequestAuthorized,
  isNonProductionEnvironment,
  isUsableSecret,
  isUsableWebhookSecret,
} from "./secrets";

describe("isUsableSecret", () => {
  it("aceita secret forte", () => {
    expect(isUsableSecret("a-secret-with-32-characters-total!")).toBe(true);
  });

  it("rejeita ausente, curto e placeholder", () => {
    expect(isUsableSecret(undefined)).toBe(false);
    expect(isUsableSecret("curto")).toBe(false);
    expect(isUsableSecret("CHANGE_ME_JWT_SECRET_16")).toBe(false);
    expect(isUsableSecret("your-super-secret-key")).toBe(false);
  });
});

describe("isUsableWebhookSecret", () => {
  it("aceita token curto mas real", () => {
    expect(isUsableWebhookSecret("expected-token")).toBe(true);
  });

  it("rejeita placeholder e vazio", () => {
    expect(isUsableWebhookSecret("CHANGE_ME")).toBe(false);
    expect(isUsableWebhookSecret("your-mercadopago-webhook-secret")).toBe(false);
    expect(isUsableWebhookSecret("")).toBe(false);
  });
});

describe("isInternalRequestAuthorized", () => {
  it("fail-closed em produção sem secret", () => {
    const req = new Request("http://x/internal/publish", { method: "POST" });
    expect(isInternalRequestAuthorized(req, { ENVIRONMENT: "production" })).toBe(false);
    expect(isInternalRequestAuthorized(req, {})).toBe(false);
  });

  it("permite somente ENVIRONMENT=test sem secret", () => {
    const req = new Request("http://x/internal/publish", { method: "POST" });
    expect(isInternalRequestAuthorized(req, { ENVIRONMENT: "test" })).toBe(true);
    expect(isInternalRequestAuthorized(req, { ENVIRONMENT: "development" })).toBe(false);
  });

  it("exige header quando secret configurado", () => {
    const secret = "a-secret-with-32-characters-total!";
    const bad = new Request("http://x/internal/publish", { method: "POST" });
    const ok = new Request("http://x/internal/publish", {
      method: "POST",
      headers: { "x-internal-secret": secret },
    });
    expect(isInternalRequestAuthorized(bad, { INTERNAL_SHARED_SECRET: secret })).toBe(false);
    expect(isInternalRequestAuthorized(ok, { INTERNAL_SHARED_SECRET: secret })).toBe(true);
  });

  it("placeholder em produção não autoriza", () => {
    const req = new Request("http://x/internal/publish", {
      method: "POST",
      headers: { "x-internal-secret": "CHANGE_ME_INTERNAL_16" },
    });
    expect(
      isInternalRequestAuthorized(req, {
        ENVIRONMENT: "production",
        INTERNAL_SHARED_SECRET: "CHANGE_ME_INTERNAL_16",
      }),
    ).toBe(false);
  });
});

describe("assertUsableSecret", () => {
  it("lança em placeholder", () => {
    expect(() => assertUsableSecret("CHANGE_ME_JWT_SECRET_16", "JWT_SECRET")).toThrow(/JWT_SECRET/);
  });

  it("retorna secret válido", () => {
    expect(assertUsableSecret("a-secret-with-32-characters-total!", "JWT_SECRET")).toBe(
      "a-secret-with-32-characters-total!",
    );
  });
});

describe("isNonProductionEnvironment", () => {
  it("reconhece ambientes locais", () => {
    expect(isNonProductionEnvironment("development")).toBe(true);
    expect(isNonProductionEnvironment("test")).toBe(true);
    expect(isNonProductionEnvironment("production")).toBe(false);
    expect(isNonProductionEnvironment(undefined)).toBe(false);
  });
});
