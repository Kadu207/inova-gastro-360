import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { processMercadoPagoNotification } from "./mercadopago";

describe("mercadopago webhook idempotência", () => {
  const applyCalls: unknown[] = [];

  beforeEach(() => {
    applyCalls.length = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL, init?: RequestInit) => {
        const u = String(url);
        if (u.includes("mercadopago.com/v1/payments/")) {
          return new Response(
            JSON.stringify({
              id: 999,
              status: "approved",
              transaction_amount: 25.0,
              external_reference: "00000000-0000-4000-8000-000000000001:00000000-0000-4000-8000-000000000099",
              payment_method: { type: "bank_transfer" },
            }),
            { status: 200 },
          );
        }
        if (u.includes("/internal/payments/apply-order")) {
          applyCalls.push(JSON.parse(String(init?.body)));
          return new Response(JSON.stringify({ applied: true }), { status: 200 });
        }
        return new Response("not found", { status: 404 });
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("processa pagamento approved e chama apply-order", async () => {
    const env = {
      MERCADOPAGO_ACCESS_TOKEN: "TEST",
      API_GATEWAY_URL: "http://127.0.0.1:8792",
    };
    const r1 = await processMercadoPagoNotification(env, { data: { id: "999" } });
    const r2 = await processMercadoPagoNotification(env, { data: { id: "999" } });
    expect(r1.applied).toBe(true);
    expect(applyCalls.length).toBe(2);
    expect(r2.applied).toBe(true);
  });
});
