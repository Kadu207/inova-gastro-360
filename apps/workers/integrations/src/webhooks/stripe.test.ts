import { describe, it, expect, vi } from "vitest";
import { processStripeEvent } from "./stripe";

describe("stripe webhook handler", () => {
  it("checkout.session.completed chama apply-subscription", async () => {
    const calls: unknown[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        calls.push(JSON.parse(String(init?.body)));
        return new Response(JSON.stringify({ applied: true }), { status: 200 });
      }),
    );

    await processStripeEvent(
      { API_GATEWAY_URL: "http://127.0.0.1:8792" },
      {
        id: "evt_1",
        type: "checkout.session.completed",
        data: {
          object: {
            metadata: { tenant_id: "00000000-0000-4000-8000-000000000001", plan_code: "pro" },
            subscription: "sub_123",
            customer: "cus_123",
          },
        },
      },
    );

    expect(calls.length).toBe(1);
    expect(calls[0]).toMatchObject({ status: "active", tenantId: "00000000-0000-4000-8000-000000000001" });
    vi.unstubAllGlobals();
  });
});
