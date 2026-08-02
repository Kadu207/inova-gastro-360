import { describe, it, expect } from "vitest";
import {
  isAsaasConfigured,
  isMercadoPagoConfigured,
  isStripeConfigured,
  isPaymentsEnabled,
  orderPaymentProvider,
  billingProvider,
} from "./payments-config";
import { testEnv } from "../test/helpers";

describe("payments-config", () => {
  it("CHANGE_ME não conta como configurado", () => {
    const env = testEnv({
      ASAAS_API_KEY: "CHANGE_ME",
      MERCADOPAGO_ACCESS_TOKEN: "CHANGE_ME",
      STRIPE_SECRET_KEY: "sk_test_CHANGE_ME",
      PAYMENTS_ENABLED: "true",
    });
    expect(isAsaasConfigured(env)).toBe(false);
    expect(isMercadoPagoConfigured(env)).toBe(false);
    expect(isStripeConfigured(env)).toBe(false);
    expect(isPaymentsEnabled(env)).toBe(false);
  });

  it("PAYMENTS_ENABLED=false desliga mesmo com token", () => {
    const env = testEnv({
      ASAAS_API_KEY: "asaas_live_key_abcdefghijklmnopqrstuvwxyz",
      PAYMENTS_ENABLED: "false",
    });
    expect(isAsaasConfigured(env)).toBe(true);
    expect(isPaymentsEnabled(env)).toBe(false);
  });

  it("Asaas key ativa pagamentos e defaults de provider", () => {
    const env = testEnv({ ASAAS_API_KEY: "asaas_test_key_abcdefghijklmnopqrstuvwxyz" });
    expect(isAsaasConfigured(env)).toBe(true);
    expect(isPaymentsEnabled(env)).toBe(true);
    expect(orderPaymentProvider(env)).toBe("asaas");
    expect(billingProvider(env)).toBe("asaas");
  });

  it("BILLING_PROVIDER=stripe e ORDER_PAYMENT_PROVIDER=mercadopago", () => {
    const env = testEnv({
      BILLING_PROVIDER: "stripe",
      ORDER_PAYMENT_PROVIDER: "mercadopago",
    });
    expect(billingProvider(env)).toBe("stripe");
    expect(orderPaymentProvider(env)).toBe("mercadopago");
  });
});
