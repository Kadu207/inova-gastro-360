import { healthHandler, jsonResponse } from "./lib";

export interface Env {
  ENVIRONMENT?: string;
  ORDERS_QUEUE?: Queue;
  REALTIME_SERVICE?: Fetcher;
  INTEGRATIONS_SERVICE?: Fetcher;
  REALTIME_URL?: string;
  INTEGRATIONS_URL?: string;
  INTERNAL_SHARED_SECRET?: string;
}

/** Valida o segredo interno quando configurado. Sem secret (dev), libera. */
function internalAuthorized(request: Request, env: Env): boolean {
  if (!env.INTERNAL_SHARED_SECRET) return true;
  return request.headers.get("x-internal-secret") === env.INTERNAL_SHARED_SECRET;
}

function internalHeaders(env: Env): Record<string, string> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (env.INTERNAL_SHARED_SECRET) headers["x-internal-secret"] = env.INTERNAL_SHARED_SECRET;
  return headers;
}

async function forwardToRealtime(env: Env, body: { type: string; payload: unknown }): Promise<void> {
  const payload = body.payload as Record<string, unknown> | undefined;
  const branchId = typeof payload?.branchId === "string" ? payload.branchId : "default";

  if (env.REALTIME_URL) {
    const base = env.REALTIME_URL.replace(/\/$/, "");
    await fetch(`${base}/broadcast?branchId=${encodeURIComponent(branchId)}`, {
      method: "POST",
      headers: internalHeaders(env),
      body: JSON.stringify(body),
    });
    return;
  }

  if (!env.REALTIME_SERVICE) return;
  await env.REALTIME_SERVICE.fetch(`http://internal/broadcast?branchId=${branchId}`, {
    method: "POST",
    headers: internalHeaders(env),
    body: JSON.stringify(body),
  });
}

async function forwardToIntegrations(env: Env, body: { type: string; payload: unknown }): Promise<void> {
  if (env.INTEGRATIONS_URL) {
    const base = env.INTEGRATIONS_URL.replace(/\/$/, "");
    await fetch(`${base}/internal/notify`, {
      method: "POST",
      headers: internalHeaders(env),
      body: JSON.stringify(body),
    });
    return;
  }

  if (!env.INTEGRATIONS_SERVICE) return;
  await env.INTEGRATIONS_SERVICE.fetch("http://internal/internal/notify", {
    method: "POST",
    headers: internalHeaders(env),
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
      if (!internalAuthorized(request, env)) return jsonResponse({ error: "forbidden" }, 403);
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
