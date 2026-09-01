import { describe, it, expect, vi } from "vitest";
import { dispatchOutboxEvent, isOutboxFlushAuthorized } from "./outbox-dispatch";
import type { GatewayEnv } from "../types/env";

describe("dispatchOutboxEvent", () => {
  it("retorna false sem MESSAGING_SERVICE", async () => {
    const ok = await dispatchOutboxEvent({} as GatewayEnv, {
      id: "id-1",
      tenant_id: "t",
      event_type: "order.created",
      payload: { orderId: "o" },
    });
    expect(ok).toBe(false);
  });

  it("retorna true quando messaging aceita", async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ accepted: true }), { status: 200 }));
    const env = { MESSAGING_SERVICE: { fetch } } as unknown as GatewayEnv;
    const ok = await dispatchOutboxEvent(env, {
      id: "id-1",
      tenant_id: "tenant-from-row",
      event_type: "order.created",
      payload: { branchId: "b" },
    });
    expect(ok).toBe(true);
    expect(fetch).toHaveBeenCalledOnce();
    const body = JSON.parse(String(fetch.mock.calls[0][1]?.body));
    expect(body.payload.tenantId).toBe("tenant-from-row");
    expect(body.payload.branchId).toBe("b");
  });

  it("retorna false quando messaging falha", async () => {
    const fetch = vi.fn(async () => {
      throw new Error("not connected");
    });
    const env = { MESSAGING_SERVICE: { fetch } } as unknown as GatewayEnv;
    const ok = await dispatchOutboxEvent(env, {
      id: "id-1",
      tenant_id: "t",
      event_type: "order.created",
      payload: {},
    });
    expect(ok).toBe(false);
  });
});

describe("isOutboxFlushAuthorized", () => {
  it("nega flush sem secret configurado (mesmo com DATABASE_URL)", () => {
    const env = { ENVIRONMENT: "production", DATABASE_URL: "postgresql://local" } as GatewayEnv;
    expect(isOutboxFlushAuthorized(new Request("http://x/internal/outbox/flush"), env)).toBe(false);
  });

  it("exige header com secret correto", () => {
    const env = { ENVIRONMENT: "production", OUTBOX_FLUSH_SECRET: "s3cret" } as GatewayEnv;
    const noHeader = new Request("http://x/internal/outbox/flush", { method: "POST" });
    expect(isOutboxFlushAuthorized(noHeader, env)).toBe(false);

    const withHeader = new Request("http://x/internal/outbox/flush", {
      method: "POST",
      headers: { "x-outbox-flush-secret": "s3cret" },
    });
    expect(isOutboxFlushAuthorized(withHeader, env)).toBe(true);
  });
});
