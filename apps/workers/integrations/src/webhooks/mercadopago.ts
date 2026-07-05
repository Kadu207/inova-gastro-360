import { parseExternalReference } from "./mercadopago-bridge";
import type { IntegrationsEnv } from "../env";

export interface MercadoPagoWebhookEnv extends IntegrationsEnv {
  MERCADOPAGO_ACCESS_TOKEN?: string;
  MERCADOPAGO_WEBHOOK_SECRET?: string;
  API_GATEWAY_URL?: string;
}

async function callApplyOrder(
  env: MercadoPagoWebhookEnv,
  body: Record<string, unknown>,
): Promise<Response> {
  const base = env.API_GATEWAY_URL ?? "http://127.0.0.1:8792";
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (env.INTERNAL_SHARED_SECRET) {
    headers["x-internal-secret"] = env.INTERNAL_SHARED_SECRET;
  }
  return fetch(`${base}/internal/payments/apply-order`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

async function fetchPayment(
  env: MercadoPagoWebhookEnv,
  paymentId: string,
): Promise<Record<string, unknown>> {
  const token = env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) throw new Error("mp_token_missing");
  const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok) throw new Error("mp_fetch_failed");
  return data;
}

export async function processMercadoPagoNotification(
  env: MercadoPagoWebhookEnv,
  notification: { data?: { id?: string | number }; id?: string | number },
): Promise<{ applied: boolean; reason?: string }> {
  const paymentId = String(notification.data?.id ?? "");
  if (!paymentId) return { applied: false, reason: "no_payment_id" };

  const payment = await fetchPayment(env, paymentId);
  const status = String(payment.status ?? "");
  const externalReference = String(payment.external_reference ?? "");
  const parsed = parseExternalReference(externalReference);
  if (!parsed) return { applied: false, reason: "invalid_reference" };

  const amountCents = Math.round(Number(payment.transaction_amount ?? 0) * 100);
  const method =
    String((payment.payment_method as { type?: string } | undefined)?.type ?? "") ===
    "credit_card"
      ? "card"
      : "pix";

  if (status === "approved") {
    const eventId = `mp-${paymentId}-${status}`;
    const res = await callApplyOrder(env, {
      provider: "mercadopago",
      externalPaymentId: paymentId,
      externalEventId: eventId,
      orderId: parsed.orderId,
      tenantId: parsed.tenantId,
      amountCents,
      method,
    });
    const json = (await res.json()) as { applied?: boolean; reason?: string };
    console.info("mercadopago_webhook_apply", {
      external_event_id: eventId,
      external_payment_id: paymentId,
      status: res.status,
      applied: json.applied,
    });
    return { applied: json.applied === true, reason: json.reason };
  }

  return { applied: false, reason: `status_${status}` };
}

export async function handleMercadoPagoWebhook(
  request: Request,
  env: MercadoPagoWebhookEnv,
): Promise<Response> {
  const rawBody = await request.text();
  const { verifyMercadoPagoSignature } = await import("../lib/signature");

  if (env.MERCADOPAGO_WEBHOOK_SECRET) {
    const valid = verifyMercadoPagoSignature(
      request.headers,
      rawBody,
      env.MERCADOPAGO_WEBHOOK_SECRET,
    );
    if (!valid) {
      return new Response(JSON.stringify({ error: "invalid_signature" }), { status: 401 });
    }
  }

  let notification: { data?: { id?: string | number }; id?: string | number };
  try {
    notification = JSON.parse(rawBody) as typeof notification;
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), { status: 400 });
  }

  try {
    await processMercadoPagoNotification(env, notification);
  } catch (err) {
    console.error("mercadopago_webhook_error", err);
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
