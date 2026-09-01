import { isInternalRequestAuthorized } from "@inova-gastro-360/runtime-node";
import { healthHandler, jsonResponse } from "./lib";
import type { IntegrationsEnv } from "./env";
import { handleMercadoPagoWebhook } from "./webhooks/mercadopago";
import { handleStripeWebhook } from "./webhooks/stripe";
import { handleAsaasWebhook } from "./webhooks/asaas";

export type Env = IntegrationsEnv;

async function forwardWebhook(url: string | undefined, body: unknown): Promise<void> {
  if (!url) return;
  await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return healthHandler("integrations");
    }

    if (url.pathname === "/webhooks/asaas" && request.method === "POST") {
      return handleAsaasWebhook(request, env);
    }

    if (url.pathname === "/webhooks/mercadopago" && request.method === "POST") {
      return handleMercadoPagoWebhook(request, env);
    }

    if (url.pathname === "/webhooks/stripe" && request.method === "POST") {
      return handleStripeWebhook(request, env);
    }

    if (url.pathname === "/internal/notify" && request.method === "POST") {
      if (!isInternalRequestAuthorized(request, env)) return jsonResponse({ error: "forbidden" }, 403);
      const body = (await request.json()) as { type: string; payload: unknown };
      ctx.waitUntil(
        Promise.all([
          forwardWebhook(env.N8N_WEBHOOK_URL, body),
          forwardWebhook(env.CHATWOOT_WEBHOOK_URL, body),
        ]),
      );
      return jsonResponse({ forwarded: true, type: body.type });
    }

    if (url.pathname === "/webhooks/n8n" && request.method === "POST") {
      return jsonResponse({ received: true });
    }

    return jsonResponse({ error: "not_found" }, 404);
  },
};
