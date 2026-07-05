import type { IntegrationsEnv } from "../env";

async function callApplySubscription(
  env: IntegrationsEnv,
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

type StripeEvent = {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
};

function objectMetadata(obj: Record<string, unknown>): Record<string, unknown> {
  const meta = obj.metadata;
  if (meta && typeof meta === "object" && !Array.isArray(meta)) {
    return meta as Record<string, unknown>;
  }
  return {};
}

function metaString(obj: Record<string, unknown>, key: string): string {
  const v = objectMetadata(obj)[key];
  return v != null ? String(v) : "";
}

function invoiceSubscriptionTenantId(obj: Record<string, unknown>): string {
  const details = obj.subscription_details;
  if (details && typeof details === "object" && !Array.isArray(details)) {
    const meta = (details as Record<string, unknown>).metadata;
    if (meta && typeof meta === "object" && !Array.isArray(meta)) {
      const tenantId = (meta as Record<string, unknown>).tenant_id;
      if (tenantId != null) return String(tenantId);
    }
  }
  return metaString(obj, "tenant_id");
}

function gracePeriodEndsAt(days = 7): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

export async function processStripeEvent(
  env: IntegrationsEnv,
  event: StripeEvent,
): Promise<void> {
  const obj = event.data.object;

  if (event.type === "checkout.session.completed") {
    const tenantId = metaString(obj, "tenant_id");
    const planCode = metaString(obj, "plan_code");
    const subscriptionId = String(obj.subscription ?? "");
    const customerId = String(obj.customer ?? "");
    if (!tenantId || !subscriptionId) return;

    await callApplySubscription(env, {
      provider: "stripe",
      eventId: event.id,
      tenantId,
      stripeSubscriptionId: subscriptionId,
      stripeCustomerId: customerId,
      planCode: planCode || undefined,
      status: "active",
    });
    return;
  }

  if (event.type === "customer.subscription.updated") {
    const tenantId = metaString(obj, "tenant_id");
    const subscriptionId = String(obj.id ?? "");
    const statusRaw = String(obj.status ?? "active");
    const status =
      statusRaw === "past_due"
        ? "past_due"
        : statusRaw === "canceled" || statusRaw === "cancelled"
          ? "cancelled"
          : statusRaw === "trialing"
            ? "trialing"
            : "active";
    const periodEnd = obj.current_period_end
      ? new Date(Number(obj.current_period_end) * 1000).toISOString()
      : undefined;

    if (!tenantId) return;
    await callApplySubscription(env, {
      provider: "stripe",
      eventId: event.id,
      tenantId,
      stripeSubscriptionId: subscriptionId,
      stripeCustomerId: String(obj.customer ?? ""),
      status,
      currentPeriodEnd: periodEnd,
      gracePeriodEndsAt: status === "past_due" ? gracePeriodEndsAt() : undefined,
    });
    return;
  }

  if (event.type === "customer.subscription.deleted") {
    const tenantId = metaString(obj, "tenant_id");
    if (!tenantId) return;
    await callApplySubscription(env, {
      provider: "stripe",
      eventId: event.id,
      tenantId,
      stripeSubscriptionId: String(obj.id ?? ""),
      status: "cancelled",
    });
    return;
  }

  if (event.type === "invoice.payment_failed") {
    const tenantId = invoiceSubscriptionTenantId(obj);
    const subId = String(obj.subscription ?? "");
    if (!tenantId) return;
    await callApplySubscription(env, {
      provider: "stripe",
      eventId: event.id,
      tenantId,
      stripeSubscriptionId: subId,
      status: "past_due",
      gracePeriodEndsAt: gracePeriodEndsAt(),
    });
  }
}

export async function handleStripeWebhook(
  request: Request,
  env: IntegrationsEnv,
): Promise<Response> {
  const rawBody = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET) {
    return new Response(JSON.stringify({ error: "not_configured" }), { status: 503 });
  }

  let event: StripeEvent;
  try {
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(env.STRIPE_SECRET_KEY);
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig ?? "",
      env.STRIPE_WEBHOOK_SECRET,
    ) as unknown as StripeEvent;
  } catch (err) {
    console.error("stripe_webhook_verify_failed", err);
    return new Response(JSON.stringify({ error: "invalid_signature" }), { status: 400 });
  }

  try {
    await processStripeEvent(env, event);
    console.info("stripe_webhook_processed", { external_event_id: event.id, type: event.type });
  } catch (err) {
    console.error("stripe_webhook_error", err);
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
