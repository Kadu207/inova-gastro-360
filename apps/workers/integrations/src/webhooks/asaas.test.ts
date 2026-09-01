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
        if (u.includes("/subscriptions/sub_1")) {
          return new Response(
            JSON.stringify({
              id: "sub_1",
              status: "ACTIVE",
              externalReference: "tenant-aaa:plan_pro",
            }),
            { status: 200 },
          );
        }
        if (u.includes("/internal/payments/apply-order")) {
          return new Response(JSON.stringify({ applied: true }), { status: 200 });
        }
        if (u.includes("/internal/payments/apply-subscription")) {
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

  it("SUBSCRIPTION_* revalida na API Asaas (ignora body forjado)", async () => {
    const env: AsaasWebhookEnv = {
      ASAAS_API_KEY: "asaas_test_key_abcdefghijklmnopqrstuvwxyz",
      ASAAS_SANDBOX: "true",
      API_GATEWAY_URL: "http://gateway.test",
      INTERNAL_SHARED_SECRET: "a-secret-with-32-characters-total!",
    };
    const result = await processAsaasNotification(env, {
      event: "SUBSCRIPTION_CREATED",
      subscription: {
        id: "sub_1",
        // body mentiroso — não deve ser usado
        externalReference: "evil-tenant:plan_hack",
        status: "INACTIVE",
      },
    });
    expect(result.applied).toBe(true);
    const calls = vi.mocked(fetch).mock.calls.map((c) => String(c[0]));
    expect(calls.some((u) => u.includes("/subscriptions/sub_1"))).toBe(true);
    const applyCall = vi.mocked(fetch).mock.calls.find((c) =>
      String(c[0]).includes("/internal/payments/apply-subscription"),
    );
    expect(applyCall).toBeTruthy();
    const body = JSON.parse(String(applyCall![1]?.body));
    expect(body.tenantId).toBe("tenant-aaa");
    expect(body.status).toBe("active");
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

  it("fail-closed sem ASAAS_WEBHOOK_TOKEN", async () => {
    const req = new Request("https://int.test/webhooks/asaas", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ event: "PAYMENT_RECEIVED", payment: { id: "pay_1" } }),
    });
    const res = await handleAsaasWebhook(req, {});
    expect(res.status).toBe(503);
    const json = (await res.json()) as { error: string };
    expect(json.error).toBe("webhook_not_configured");
  });

  it("fail-closed com placeholder de token", async () => {
    const req = new Request("https://int.test/webhooks/asaas", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "asaas-access-token": "your-asaas-webhook-token",
      },
      body: JSON.stringify({ event: "PAYMENT_RECEIVED", payment: { id: "pay_1" } }),
    });
    const res = await handleAsaasWebhook(req, {
      ASAAS_WEBHOOK_TOKEN: "your-asaas-webhook-token",
    });
    expect(res.status).toBe(503);
  });
});
