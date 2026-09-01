import { describe, it, expect } from "vitest";
import worker from "./index";
import { healthHandler } from "./lib";

describe("messaging-bus", () => {
  it("health is ok", async () => {
    const body = (await (await healthHandler("messaging-bus")).json()) as { service: string };
    expect(body.service).toBe("messaging-bus");
  });

  it("nega /internal/publish sem secret em produção", async () => {
    const req = new Request("http://msg.test/internal/publish", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "order.created", payload: {} }),
    });
    const res = await worker.fetch(req, { ENVIRONMENT: "production" });
    expect(res.status).toBe(403);
  });

  it("nega /internal/publish com placeholder de secret", async () => {
    const req = new Request("http://msg.test/internal/publish", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-internal-secret": "CHANGE_ME_INTERNAL_16",
      },
      body: JSON.stringify({ type: "order.created", payload: {} }),
    });
    const res = await worker.fetch(req, {
      ENVIRONMENT: "production",
      INTERNAL_SHARED_SECRET: "CHANGE_ME_INTERNAL_16",
    });
    expect(res.status).toBe(403);
  });

  it("aceita /internal/publish com secret válido", async () => {
    const secret = "a-secret-with-32-characters-total!";
    const req = new Request("http://msg.test/internal/publish", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-internal-secret": secret,
      },
      body: JSON.stringify({ type: "order.created", payload: { branchId: "b1" } }),
    });
    const res = await worker.fetch(req, { INTERNAL_SHARED_SECRET: secret });
    expect(res.status).toBe(200);
  });

  it("encaminha tenantId e branchId para a sala realtime", async () => {
    const secret = "a-secret-with-32-characters-total!";
    let forwardedUrl = "";
    const req = new Request("http://msg.test/internal/publish", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-internal-secret": secret,
      },
      body: JSON.stringify({
        type: "order.created",
        payload: { tenantId: "tenant-a", branchId: "branch-b" },
      }),
    });
    const res = await worker.fetch(req, {
      INTERNAL_SHARED_SECRET: secret,
      REALTIME_SERVICE: {
        fetch: async (input: RequestInfo | URL) => {
          forwardedUrl = String(input);
          return new Response(null, { status: 200 });
        },
      } as unknown as Fetcher,
    });
    expect(res.status).toBe(200);
    expect(forwardedUrl).toContain("tenantId=tenant-a&branchId=branch-b");
  });
});
