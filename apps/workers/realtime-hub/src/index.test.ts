import { describe, it, expect } from "vitest";
import { signAccessToken } from "@inova-gastro-360/auth";
import { healthHandler } from "./lib";
import worker from "./index";

const JWT_SECRET = "test-secret-min-32-characters-long!!";
const INTERNAL = "test-internal-secret-min-32-chars";
const BRANCH = "00000000-0000-4000-8000-000000000002";

describe("realtime-hub", () => {
  it("health ok", async () => {
    const body = (await (await healthHandler("realtime-hub")).json()) as { status: string };
    expect(body.status).toBe("ok");
  });

  it("DO rejeita fetch sem auth interna", async () => {
    const { BranchRealtimeHub } = await import("./lib");
    const hub = new BranchRealtimeHub({} as DurableObjectState);
    const res = await hub.fetch(new Request("http://do/broadcast", { method: "POST", body: "{}" }));
    expect(res.status).toBe(403);
  });

  it("WS sem token retorna 401", async () => {
    const res = await worker.fetch(
      new Request(`http://rt/ws?branchId=${BRANCH}`, { headers: { Upgrade: "websocket" } }),
      {
        BRANCH_HUB: {
          idFromName: () => ({ toString: () => "id" }),
          get: () => ({ fetch: async () => new Response("ok") }),
        } as unknown as DurableObjectNamespace,
        JWT_SECRET,
        INTERNAL_SHARED_SECRET: INTERNAL,
      },
    );
    expect(res.status).toBe(401);
  });

  it("broadcast sem secret retorna 403", async () => {
    const res = await worker.fetch(
      new Request(`http://rt/broadcast?branchId=${BRANCH}`, {
        method: "POST",
        body: JSON.stringify({ type: "ping", payload: {} }),
      }),
      {
        BRANCH_HUB: {
          idFromName: () => ({ toString: () => "id" }),
          get: () => ({ fetch: async () => new Response(JSON.stringify({ ok: true })) }),
        } as unknown as DurableObjectNamespace,
        JWT_SECRET,
        INTERNAL_SHARED_SECRET: INTERNAL,
      },
    );
    expect(res.status).toBe(403);
  });

  it("broadcast com secret encaminha ao DO", async () => {
    let forwarded = false;
    const res = await worker.fetch(
      new Request(`http://rt/broadcast?branchId=${BRANCH}`, {
        method: "POST",
        headers: { "x-internal-secret": INTERNAL, "content-type": "application/json" },
        body: JSON.stringify({ type: "ping", payload: {} }),
      }),
      {
        BRANCH_HUB: {
          idFromName: () => ({ toString: () => "id" }),
          get: () => ({
            fetch: async () => {
              forwarded = true;
              return new Response(JSON.stringify({ ok: true, delivered: 0 }), {
                headers: { "content-type": "application/json" },
              });
            },
          }),
        } as unknown as DurableObjectNamespace,
        JWT_SECRET,
        INTERNAL_SHARED_SECRET: INTERNAL,
      },
    );
    expect(res.status).toBe(200);
    expect(forwarded).toBe(true);
  });

  it("WS com JWT de outra filial retorna 401", async () => {
    const token = await signAccessToken(
      {
        sub: "u1",
        tid: "t1",
        email: "a@b.com",
        role: "atendente",
        branches: ["00000000-0000-4000-8000-000000000099"],
      },
      JWT_SECRET,
    );
    const res = await worker.fetch(
      new Request(`http://rt/ws?branchId=${BRANCH}`, {
        headers: {
          Upgrade: "websocket",
          "Sec-WebSocket-Protocol": `inova.jwt, ${token}`,
        },
      }),
      {
        BRANCH_HUB: {
          idFromName: () => ({ toString: () => "id" }),
          get: () => ({ fetch: async () => new Response("should-not-run") }),
        } as unknown as DurableObjectNamespace,
        JWT_SECRET,
        INTERNAL_SHARED_SECRET: INTERNAL,
      },
    );
    expect(res.status).toBe(401);
  });
});
