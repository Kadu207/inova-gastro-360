import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { processAsaasNotification, handleAsaasWebhook } from "./asaas";
import type { AsaasWebhookEnv } from "./asaas";

describe("asaas webhook", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL) => {
        const u = String(url);
        if (u.includes("/payments/pay_1")) {
          return new Response(
            JSON.stringify({
              id: "pay_1",
              status: "RECEIVED",
              value: 32,
              billingType: "PIX",
              externalReference: "11111111-1111-4111-8111-111111111111:22222222-2222-4222-8222-222222222222",
            }),
            { status: 200 },
          );
        }
        if (u.includes("/internal/payments/apply-order")) {
          return new Response(JSON.stringify({ applied: true }), { status: 200 });
        }
        return new Response("{}", { status: 404 });
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("PAYMENT_RECEIVED aplica order payment", async () => {
    const env: AsaasWebhookEnv = {
      ASAAS_API_KEY: "asaas_test_key_abcdefghijklmnopqrstuvwxyz",
      ASAAS_SANDBOX: "true",
      API_GATEWAY_URL: "http://gateway.test",
      INTERNAL_SHARED_SECRET: "secret",
    };
    const result = await processAsaasNotification(env, {
      event: "PAYMENT_RECEIVED",
      payment: { id: "pay_1" },
    });
    expect(result.applied).toBe(true);
  });

  it("rejeita token inválido", async () => {
    const env: AsaasWebhookEnv = {
      ASAAS_WEBHOOK_TOKEN: "expected-token",
    };
    const req = new Request("https://int.test/webhooks/asaas", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "asaas-access-token": "wrong",
      },
      body: JSON.stringify({ event: "PAYMENT_RECEIVED", payment: { id: "pay_1" } }),
    });
    const res = await handleAsaasWebhook(req, env);
    expect(res.status).toBe(401);
  });
});
