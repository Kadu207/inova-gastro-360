import { z } from "zod";
import { jsonResponse, parseJsonBody } from "../lib";
import { getSql, setTenantContext } from "../lib/db";
import { requireRole } from "../middleware/auth";
import type { GatewayEnv } from "../types/env";
import type { JwtPayload } from "@inova-gastro-360/auth";
import {
  createCheckoutSession,
  createPortalSession,
  StripeConfigError,
} from "../lib/stripe-billing";
import { createAsaasSubscriptionCheckout, AsaasConfigError } from "../lib/asaas";
import { billingProvider, isBillingReady } from "../lib/payments-config";

const BILLING_ROLES = ["admin_cliente", "super_admin"] as const;

const CheckoutSchema = z.object({
  planCode: z.string().min(1),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

const PortalSchema = z.object({
  returnUrl: z.string().url(),
});

export async function handleGetSubscription(
  _request: Request,
  env: GatewayEnv,
  user: JwtPayload,
): Promise<Response> {
  const sql = getSql(env);
  try {
    await setTenantContext(sql, user.tid);
    const [sub] = await sql<
      {
        status: string;
        trial_ends_at: Date | null;
        current_period_end: Date | null;
        grace_period_ends_at: Date | null;
        plan_code: string | null;
        plan_name: string | null;
        price_cents: number | null;
      }[]
    >`
      SELECT s.status, s.trial_ends_at, s.current_period_end, s.grace_period_ends_at,
             p.code AS plan_code, p.name AS plan_name, p.price_cents
      FROM subscriptions s
      LEFT JOIN subscription_plans p ON p.id = s.plan_id
      WHERE s.tenant_id = ${user.tid}::uuid
      LIMIT 1
    `;
    if (!sub) return jsonResponse({ error: "subscription_not_found" }, 404);

    return jsonResponse({
      status: sub.status,
      plan: sub.plan_code
        ? { code: sub.plan_code, name: sub.plan_name, priceCents: sub.price_cents ?? 0 }
        : null,
      trialEndsAt: sub.trial_ends_at?.toISOString() ?? null,
      currentPeriodEnd: sub.current_period_end?.toISOString() ?? null,
      gracePeriodEndsAt: sub.grace_period_ends_at?.toISOString() ?? null,
      billingProvider: billingProvider(env),
    });
  } finally {
    await sql.end();
  }
}

export async function handleListPlans(_request: Request, env: GatewayEnv): Promise<Response> {
  const sql = getSql(env);
  try {
    const plans = await sql`
      SELECT code, name, price_cents, max_branches, max_products
      FROM subscription_plans
      WHERE is_active = true
      ORDER BY price_cents ASC
    `;
    return jsonResponse({ plans });
  } finally {
    await sql.end();
  }
}

export async function handleBillingCheckout(
  request: Request,
  env: GatewayEnv,
  user: JwtPayload,
): Promise<Response> {
  const roleCheck = requireRole(user, ...BILLING_ROLES);
  if (!roleCheck.ok) return roleCheck.response;

  const parsed = CheckoutSchema.safeParse(await parseJsonBody(request));
  if (!parsed.success) return jsonResponse({ error: "validation_error" }, 400);

  if (!isBillingReady(env)) {
    return jsonResponse({ error: "payments_not_configured" }, 503);
  }

  const provider = billingProvider(env);
  const sql = getSql(env);
  try {
    const [plan] = await sql<
      {
        id: string;
        stripe_price_id: string | null;
        price_cents: number;
        asaas_plan_value_cents: number | null;
      }[]
    >`
      SELECT id, stripe_price_id, price_cents, asaas_plan_value_cents
      FROM subscription_plans
      WHERE code = ${parsed.data.planCode} AND is_active = true LIMIT 1
    `;
    if (!plan) {
      return jsonResponse({ error: "plan_not_available" }, 404);
    }

    if (provider === "asaas") {
      const valueCents = plan.asaas_plan_value_cents ?? plan.price_cents;
      if (!valueCents || valueCents <= 0) {
        return jsonResponse({ error: "plan_not_available" }, 404);
      }
      const session = await createAsaasSubscriptionCheckout(env, {
        tenantId: user.tid,
        planCode: parsed.data.planCode,
        valueCents,
        cycle: "MONTHLY",
        customerEmail: user.email,
        successUrl: parsed.data.successUrl,
      });

      await setTenantContext(sql, user.tid);
      await sql`
        INSERT INTO subscription_checkouts (
          id, tenant_id, plan_id, asaas_checkout_id, status, updated_at
        ) VALUES (
          gen_random_uuid(), ${user.tid}::uuid, ${plan.id}::uuid,
          ${session.subscriptionId}, 'open', NOW()
        )
        ON CONFLICT (asaas_checkout_id) DO NOTHING
      `;
      await sql`
        UPDATE subscriptions
        SET asaas_customer_id = COALESCE(${session.customerId}, asaas_customer_id),
            asaas_subscription_id = COALESCE(${session.subscriptionId}, asaas_subscription_id),
            updated_at = NOW()
        WHERE tenant_id = ${user.tid}::uuid
      `;

      return jsonResponse({
        checkoutUrl: session.checkoutUrl,
        sessionId: session.subscriptionId,
        provider: "asaas",
      });
    }

    if (!plan.stripe_price_id) {
      return jsonResponse({ error: "plan_not_available" }, 404);
    }

    const session = await createCheckoutSession(env, {
      tenantId: user.tid,
      planCode: parsed.data.planCode,
      stripePriceId: plan.stripe_price_id,
      successUrl: parsed.data.successUrl,
      cancelUrl: parsed.data.cancelUrl,
      customerEmail: user.email,
    });

    await setTenantContext(sql, user.tid);
    await sql`
      INSERT INTO subscription_checkouts (
        id, tenant_id, plan_id, stripe_checkout_session_id, status, updated_at
      ) VALUES (
        gen_random_uuid(), ${user.tid}::uuid, ${plan.id}::uuid,
        ${session.sessionId}, 'open', NOW()
      )
      ON CONFLICT (stripe_checkout_session_id) DO NOTHING
    `;

    return jsonResponse({
      checkoutUrl: session.checkoutUrl,
      sessionId: session.sessionId,
      provider: "stripe",
    });
  } catch (err) {
    if (err instanceof StripeConfigError || err instanceof AsaasConfigError) {
      return jsonResponse({ error: "payments_not_configured" }, 503);
    }
    throw err;
  } finally {
    await sql.end();
  }
}

export async function handleBillingPortal(
  request: Request,
  env: GatewayEnv,
  user: JwtPayload,
): Promise<Response> {
  const roleCheck = requireRole(user, ...BILLING_ROLES);
  if (!roleCheck.ok) return roleCheck.response;

  const parsed = PortalSchema.safeParse(await parseJsonBody(request));
  if (!parsed.success) return jsonResponse({ error: "validation_error" }, 400);

  const provider = billingProvider(env);
  if (provider === "asaas") {
    return jsonResponse({
      error: "portal_not_supported",
      message: "Portal Asaas: gerencie cobranças no painel Asaas ou suporte Inova TI",
    }, 501);
  }

  const sql = getSql(env);
  try {
    await setTenantContext(sql, user.tid);
    const [sub] = await sql<{ stripe_customer_id: string | null }[]>`
      SELECT stripe_customer_id FROM subscriptions
      WHERE tenant_id = ${user.tid}::uuid LIMIT 1
    `;
    if (!sub?.stripe_customer_id) {
      return jsonResponse({ error: "no_stripe_customer" }, 404);
    }

    const portal = await createPortalSession(env, sub.stripe_customer_id, parsed.data.returnUrl);
    return jsonResponse({ portalUrl: portal.portalUrl });
  } catch (err) {
    if (err instanceof StripeConfigError) {
      return jsonResponse({ error: "payments_not_configured" }, 503);
    }
    throw err;
  } finally {
    await sql.end();
  }
}
