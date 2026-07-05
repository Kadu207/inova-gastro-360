import { describe, it, expect } from "vitest";
import {
  isMercadoPagoConfigured,
  isStripeConfigured,
  isPaymentsEnabled,
} from "./payments-config";
import { testEnv } from "../test/helpers";

describe("payments-config", () => {
  it("CHANGE_ME não conta como configurado", () => {
    const env = testEnv({
      MERCADOPAGO_ACCESS_TOKEN: "CHANGE_ME",
      STRIPE_SECRET_KEY: "sk_test_CHANGE_ME",
      PAYMENTS_ENABLED: "true",
    });
    expect(isMercadoPagoConfigured(env)).toBe(false);
    expect(isStripeConfigured(env)).toBe(false);
    expect(isPaymentsEnabled(env)).toBe(false);
  });

  it("PAYMENTS_ENABLED=false desliga mesmo com token", () => {
    const env = testEnv({
      MERCADOPAGO_ACCESS_TOKEN: "TEST-123456789",
      PAYMENTS_ENABLED: "false",
    });
    expect(isMercadoPagoConfigured(env)).toBe(true);
    expect(isPaymentsEnabled(env)).toBe(false);
  });

  it("token TEST- ativa mercado pago", () => {
    const env = testEnv({ MERCADOPAGO_ACCESS_TOKEN: "TEST-abc123" });
    expect(isMercadoPagoConfigured(env)).toBe(true);
    expect(isPaymentsEnabled(env)).toBe(true);
  });
});
