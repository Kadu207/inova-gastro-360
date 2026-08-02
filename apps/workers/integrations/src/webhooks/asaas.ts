import type { IntegrationsEnv } from "../env";

export interface AsaasWebhookEnv extends IntegrationsEnv {
  ASAAS_API_KEY?: string;
  ASAAS_WEBHOOK_TOKEN?: string;
  ASAAS_SANDBOX?: string;
  PAYMENTS_SANDBOX?: string;
  API_GATEWAY_URL?: string;
}

function parseExternalReference(ref: string): { tenantId: string; orderId: string } | null {
  const parts = ref.split(":");
  if (parts.length !== 2) return null;
  const [tenantId, orderId] = parts;
  if (!tenantId || !orderId) return null;
  return { tenantId, orderId };
}

function asaasBaseUrl(env: AsaasWebhookEnv): string {
  const sandbox =
    env.ASAAS_SANDBOX?.trim().toLowerCase() === "true" ||
    env.ASAAS_SANDBOX === "1" ||
    env.PAYMENTS_SANDBOX?.trim().toLowerCase() === "true" ||
    env.PAYMENTS_SANDBOX === "1";
  return sandbox ? "https://sandbox.asaas.com/api/v3" : "https://api.asaas.com/api/v3";
}

async function callApplyOrder(
  env: AsaasWebhookEnv,
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

async function callApplySubscription(
  env: AsaasWebhookEnv,
  body: Record<string, unknown>,
): Promise<Response> {
  const base = env.API_GATEWAY_URL ?? "http://127.0.0.1:8792";
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (env.INTERNAL_SHARED_SECRET) {
    headers["x-internal-secret"] = env.INTERNAL_SHARED_SECRET;
  }
  return fetch(`${base}/internal/payments/apply-subscription`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

async function fetchPayment(
  env: AsaasWebhookEnv,
  paymentId: string,
): Promise<Record<string, unknown>> {
  const key = env.ASAAS_API_KEY;
  if (!key) throw new Error("asaas_key_missing");
  const res = await fetch(`${asaasBaseUrl(env)}/payments/${paymentId}`, {
    headers: {
      access_token: key,
      "User-Agent": "InovaGastro360/1.0",
    },
  });
  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok) throw new Error("asaas_fetch_failed");
  return data;
}

const PAID_STATUSES = new Set(["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"]);

export async function processAsaasNotification(
  env: AsaasWebhookEnv,
  notification: {
    event?: string;
    payment?: { id?: string };
    subscription?: { id?: string; externalReference?: string; status?: string };
  },
): Promise<{ applied: boolean; reason?: string }> {
  const event = String(notification.event ?? "");

  if (notification.subscription?.id && event.startsWith("SUBSCRIPTION_")) {
    const status = String(notification.subscription.status ?? "");
    const ref = String(notification.subscription.externalReference ?? "");
    const [tenantId, planCode] = ref.split(":");
    if (!tenantId) return { applied: false, reason: "invalid_subscription_ref" };

    let mapped: string;
    switch (status) {
      case "ACTIVE":
        mapped = "active";
        break;
      case "INACTIVE":
      case "EXPIRED":
        mapped = "canceled";
        break;
      case "OVERDUE":
        mapped = "past_due";
        break;
      default:
        mapped = "active";
        break;
    }

    const eventId = `asaas-sub-${notification.subscription.id}-${event}`;
    const res = await callApplySubscription(env, {
      provider: "asaas",
      externalEventId: eventId,
      tenantId,
      planCode: planCode || undefined,
      status: mapped,
      asaasSubscriptionId: notification.subscription.id,
    });
    const json = (await res.json()) as { applied?: boolean; reason?: string };
    return { applied: json.applied === true, reason: json.reason };
  }

  const paymentId = String(notification.payment?.id ?? "");
  if (!paymentId) return { applied: false, reason: "no_payment_id" };

  const payment = await fetchPayment(env, paymentId);
  const status = String(payment.status ?? "");
  const externalReference = String(payment.externalReference ?? "");
  const parsed = parseExternalReference(externalReference);
  if (!parsed) return { applied: false, reason: "invalid_reference" };

  const amountCents = Math.round(Number(payment.value ?? 0) * 100);
  const billingType = String(payment.billingType ?? "");
  const method = billingType === "CREDIT_CARD" || billingType === "DEBIT_CARD" ? "card" : "pix";

  if (PAID_STATUSES.has(status) || event === "PAYMENT_RECEIVED" || event === "PAYMENT_CONFIRMED") {
    const eventId = `asaas-${paymentId}-${status || event}`;
    const res = await callApplyOrder(env, {
      provider: "asaas",
      externalPaymentId: paymentId,
      externalEventId: eventId,
      orderId: parsed.orderId,
      tenantId: parsed.tenantId,
      amountCents,
      method,
    });
    const json = (await res.json()) as { applied?: boolean; reason?: string };
    console.info("asaas_webhook_apply", {
      external_event_id: eventId,
      external_payment_id: paymentId,
      status: res.status,
      applied: json.applied,
    });
    return { applied: json.applied === true, reason: json.reason };
  }

  return { applied: false, reason: `status_${status}` };
}

export async function handleAsaasWebhook(
  request: Request,
  env: AsaasWebhookEnv,
): Promise<Response> {
  const rawBody = await request.text();
  const { verifyAsaasWebhookToken } = await import("../lib/signature");

  if (env.ASAAS_WEBHOOK_TOKEN) {
    const valid = verifyAsaasWebhookToken(request.headers, env.ASAAS_WEBHOOK_TOKEN);
    if (!valid) {
      return new Response(JSON.stringify({ error: "invalid_signature" }), { status: 401 });
    }
  }

  let notification: {
    event?: string;
    payment?: { id?: string };
    subscription?: { id?: string; externalReference?: string; status?: string };
  };
  try {
    notification = JSON.parse(rawBody) as typeof notification;
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), { status: 400 });
  }

  try {
    const result = await processAsaasNotification(env, notification);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    console.error("asaas_webhook_error", err);
    return new Response(JSON.stringify({ error: "processing_failed" }), { status: 500 });
  }
}
