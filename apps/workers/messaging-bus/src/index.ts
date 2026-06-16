import { healthHandler, jsonResponse } from "./lib";

export interface Env {
  ENVIRONMENT?: string;
  ORDERS_QUEUE?: Queue;
  REALTIME_SERVICE?: Fetcher;
  INTEGRATIONS_SERVICE?: Fetcher;
}

async function forwardToRealtime(env: Env, body: { type: string; payload: unknown }): Promise<void> {
  if (!env.REALTIME_SERVICE) return;
  const payload = body.payload as Record<string, unknown> | undefined;
  const branchId = typeof payload?.branchId === "string" ? payload.branchId : "default";
  await env.REALTIME_SERVICE.fetch(`http://internal/broadcast?branchId=${branchId}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function forwardToIntegrations(env: Env, body: { type: string; payload: unknown }): Promise<void> {
  if (!env.INTEGRATIONS_SERVICE) return;
  await env.INTEGRATIONS_SERVICE.fetch("http://internal/internal/notify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return healthHandler("messaging-bus");
    }

    if (url.pathname === "/internal/publish" && request.method === "POST") {
      const body = (await request.json()) as { type: string; payload: unknown };
      if (env.ORDERS_QUEUE) {
        await env.ORDERS_QUEUE.send(body);
      }
      await forwardToRealtime(env, body);
      await forwardToIntegrations(env, body);
      return jsonResponse({ accepted: true, type: body.type });
    }

    return jsonResponse({ error: "not_found" }, 404);
  },

  async queue(batch: MessageBatch<{ type: string; payload: unknown }>, _env: Env, ctx: ExecutionContext): Promise<void> {
    for (const message of batch.messages) {
      ctx.waitUntil(forwardToRealtime(_env, message.body));
      ctx.waitUntil(forwardToIntegrations(_env, message.body));
      message.ack();
    }
  },
};
