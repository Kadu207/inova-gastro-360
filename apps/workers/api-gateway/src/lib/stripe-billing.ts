import Stripe from "stripe";
import type { GatewayEnv } from "../types/env";

export class StripeConfigError extends Error {
  constructor(message = "STRIPE_SECRET_KEY não configurado") {
    super(message);
    this.name = "StripeConfigError";
  }
}

function getStripe(env: GatewayEnv): Stripe {
  const key = env.STRIPE_SECRET_KEY?.trim();
  if (!key) throw new StripeConfigError();
  return new Stripe(key);
}

export interface CheckoutSessionInput {
  tenantId: string;
  planCode: string;
  stripePriceId: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
}

export async function createCheckoutSession(
  env: GatewayEnv,
  input: CheckoutSessionInput,
): Promise<{ checkoutUrl: string; sessionId: string }> {
  const stripe = getStripe(env);
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: input.stripePriceId, quantity: 1 }],
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    customer_email: input.customerEmail,
    metadata: {
      tenant_id: input.tenantId,
      plan_code: input.planCode,
    },
    subscription_data: {
      metadata: {
        tenant_id: input.tenantId,
        plan_code: input.planCode,
      },
    },
  });

  if (!session.url) throw new Error("stripe_checkout_url_missing");
  return { checkoutUrl: session.url, sessionId: session.id };
}

export async function createPortalSession(
  env: GatewayEnv,
  stripeCustomerId: string,
  returnUrl: string,
): Promise<{ portalUrl: string }> {
  const stripe = getStripe(env);
  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: returnUrl,
  });
  return { portalUrl: session.url };
}

export function constructStripeWebhookEvent(
  env: GatewayEnv,
  payload: string,
  signature: string | null,
): Stripe.Event {
  const secret = env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) throw new StripeConfigError("STRIPE_WEBHOOK_SECRET não configurado");
  if (!signature) throw new Error("stripe_signature_missing");
  const stripe = getStripe(env);
  return stripe.webhooks.constructEvent(payload, signature, secret);
}

export { getStripe };
