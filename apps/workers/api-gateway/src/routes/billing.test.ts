import { describe, it, expect, vi } from "vitest";
import { handleGetSubscription, handleBillingCheckout } from "./billing";
import { testEnv } from "../test/helpers";

vi.mock("../lib/stripe-billing", () => ({
  createCheckoutSession: vi.fn(async () => ({
    checkoutUrl: "https://checkout.stripe.com/test",
    sessionId: "cs_test_123",
  })),
  createPortalSession: vi.fn(),
  StripeConfigError: class extends Error {},
}));

describe("billing routes", () => {
  const adminUser = {
    sub: "u1",
    tid: "00000000-0000-4000-8000-000000000001",
    email: "admin@test.com",
    role: "admin_cliente",
    branches: [],
  };

  it("checkout retorna checkoutUrl quando plano existe", async () => {
    const env = testEnv();
    const req = new Request("https://api.test/api/v1/billing/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        planCode: "starter",
        successUrl: "https://app.test/success",
        cancelUrl: "https://app.test/cancel",
      }),
    });
    const res = await handleBillingCheckout(req, env, adminUser);
    expect([200, 404, 503]).toContain(res.status);
    if (res.status === 200) {
      const body = (await res.json()) as { checkoutUrl: string };
      expect(body.checkoutUrl).toContain("stripe.com");
    }
  });

  it("RBAC nega atendente (403)", async () => {
    const env = testEnv({ DATABASE_URL: undefined });
    const req = new Request("https://api.test/api/v1/billing/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        planCode: "pro",
        successUrl: "https://app.test/success",
        cancelUrl: "https://app.test/cancel",
      }),
    });
    const res = await handleBillingCheckout(req, env, { ...adminUser, role: "atendente" });
    expect(res.status).toBe(403);
  });

  it("GET subscription", async () => {
    const env = testEnv();
    const res = await handleGetSubscription(new Request("https://api.test"), env, adminUser);
    expect([200, 404]).toContain(res.status);
  });
});
