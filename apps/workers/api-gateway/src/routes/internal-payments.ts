import { z } from "zod";
import type { JSONValue } from "postgres";
import { jsonResponse, parseJsonBody } from "../lib";
import { EVENT_TYPES, publishOutboxEvent } from "../lib/outbox";
import { getSql, hasDatabase, setTenantContext, withTenant } from "../lib/db";
import type { GatewayEnv } from "../types/env";

const ApplyOrderSchema = z.object({
  provider: z.string().min(1),
  externalPaymentId: z.string().min(1),
  externalEventId: z.string().min(1),
  orderId: z.string().uuid(),
  tenantId: z.string().uuid(),
  amountCents: z.number().int().positive(),
  method: z.enum(["pix", "card"]),
});

const ApplySubscriptionSchema = z.object({
  provider: z.literal("stripe"),
  eventId: z.string().min(1),
  tenantId: z.string().uuid(),
  stripeSubscriptionId: z.string().min(1),
  stripeCustomerId: z.string().optional(),
  planCode: z.string().optional(),
  status: z.enum(["active", "past_due", "cancelled", "trialing", "restricted"]),
  currentPeriodEnd: z.string().datetime().optional(),
  gracePeriodEndsAt: z.string().datetime().optional(),
});

export function isInternalAuthorized(request: Request, env: GatewayEnv): boolean {
  const secret = env.INTERNAL_SHARED_SECRET;
  if (!secret) {
    return env.ENVIRONMENT === "test" || env.ENVIRONMENT === "development";
  }
  return request.headers.get("x-internal-secret") === secret;
}

function internalHeaders(env: GatewayEnv): Record<string, string> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (env.INTERNAL_SHARED_SECRET) {
    headers["x-internal-secret"] = env.INTERNAL_SHARED_SECRET;
  }
  return headers;
}

export { internalHeaders };

export async function handleApplyOrderPayment(
  request: Request,
  env: GatewayEnv,
): Promise<Response> {
  if (!isInternalAuthorized(request, env)) {
    return jsonResponse({ error: "forbidden" }, 403);
  }

  const parsed = ApplyOrderSchema.safeParse(await parseJsonBody(request));
  if (!parsed.success) {
    return jsonResponse({ error: "validation_error" }, 400);
  }
  if (!hasDatabase(env)) {
    return jsonResponse({ error: "database_unavailable" }, 503);
  }

  const body = parsed.data;
  const sql = getSql(env);

  try {
    await setTenantContext(sql, body.tenantId);

    let eventId: string;
    try {
      const [inserted] = await sql<{ id: string }[]>`
        INSERT INTO payment_events (
          id, tenant_id, provider, external_event_id, event_type, payload, created_at
        ) VALUES (
          gen_random_uuid(),
          ${body.tenantId}::uuid,
          ${body.provider},
          ${body.externalEventId},
          'payment.apply_order',
          ${sql.json(body as unknown as JSONValue)},
          NOW()
        )
        RETURNING id
      `;
      eventId = inserted.id;
    } catch (err: unknown) {
      const pgErr = err as { code?: string };
      if (pgErr.code === "23505") {
        const [existing] = await sql<{ result: string | null }[]>`
          SELECT result FROM payment_events
          WHERE provider = ${body.provider}
            AND external_event_id = ${body.externalEventId}
          LIMIT 1
        `;
        if (existing?.result === "applied") {
          return jsonResponse({
            applied: false,
            reason: "already_paid",
            paymentStatus: "paid",
          });
        }
        return jsonResponse({ applied: false, reason: "duplicate_event" });
      }
      throw err;
    }

    const outcome = await withTenant(sql, body.tenantId, async (tx) => {
      const [order] = await tx<
        {
          id: string;
          total_cents: number;
          payment_status: string;
          branch_id: string;
          tenant_id: string;
        }[]
      >`
        SELECT id, total_cents, payment_status, branch_id, tenant_id
        FROM orders
        WHERE id = ${body.orderId}::uuid
        LIMIT 1
      `;

      if (!order || order.tenant_id !== body.tenantId) {
        return { ok: false as const, reason: "order_not_found" as const };
      }
      if (order.payment_status === "paid") {
        return {
          ok: false as const,
          reason: "already_paid" as const,
          paymentStatus: "paid" as const,
        };
      }
      if (order.total_cents !== body.amountCents) {
        return {
          ok: false as const,
          reason: "amount_mismatch" as const,
          expected: order.total_cents,
        };
      }

      await tx`
        UPDATE orders
        SET payment_status = 'paid',
            payment_method = ${body.method},
            paid_at = NOW(),
            updated_at = NOW()
        WHERE id = ${body.orderId}::uuid
      `;

      await tx`
        UPDATE payment_intents
        SET status = 'paid',
            external_id = COALESCE(external_id, ${body.externalPaymentId}),
            updated_at = NOW()
        WHERE order_id = ${body.orderId}::uuid
          AND status IN ('created', 'pending')
      `;

      return {
        ok: true as const,
        branchId: order.branch_id,
      };
    });

    if (!outcome.ok) {
      const httpStatus =
        outcome.reason === "order_not_found"
          ? 404
          : outcome.reason === "amount_mismatch"
            ? 409
            : 409;
      await sql`
        UPDATE payment_events
        SET result = 'failed',
            error_message = ${outcome.reason},
            processed_at = NOW()
        WHERE id = ${eventId}::uuid
      `;
      return jsonResponse(
        {
          applied: false,
          reason: outcome.reason,
          ...("expected" in outcome ? { expected: outcome.expected } : {}),
          ...("paymentStatus" in outcome ? { paymentStatus: outcome.paymentStatus } : {}),
        },
        httpStatus,
      );
    }

    await sql`
      UPDATE payment_events
      SET result = 'applied', processed_at = NOW()
      WHERE id = ${eventId}::uuid
    `;

    await publishOutboxEvent(
      env,
      body.tenantId,
      EVENT_TYPES.ORDER_PAYMENT_CONFIRMED,
      {
        orderId: body.orderId,
        tenantId: body.tenantId,
        branchId: outcome.branchId,
        amountCents: body.amountCents,
        method: body.method,
        externalPaymentId: body.externalPaymentId,
      },
      `payment-confirmed-${body.externalEventId}`,
    );

    return jsonResponse({ applied: true, paymentStatus: "paid" });
  } finally {
    await sql.end();
  }
}

export async function handleApplySubscriptionPayment(
  request: Request,
  env: GatewayEnv,
): Promise<Response> {
  if (!isInternalAuthorized(request, env)) {
    return jsonResponse({ error: "forbidden" }, 403);
  }

  const parsed = ApplySubscriptionSchema.safeParse(await parseJsonBody(request));
  if (!parsed.success) {
    return jsonResponse({ error: "validation_error" }, 400);
  }
  if (!hasDatabase(env)) {
    return jsonResponse({ error: "database_unavailable" }, 503);
  }

  const body = parsed.data;
  const sql = getSql(env);

  try {
    await setTenantContext(sql, body.tenantId);

    try {
      await sql`
        INSERT INTO payment_events (
          id, tenant_id, provider, external_event_id, event_type, payload, created_at
        ) VALUES (
          gen_random_uuid(),
          ${body.tenantId}::uuid,
          ${body.provider},
          ${body.eventId},
          'subscription.sync',
          ${sql.json(body as unknown as JSONValue)},
          NOW()
        )
      `;
    } catch (err: unknown) {
      const pgErr = err as { code?: string };
      if (pgErr.code === "23505") {
        return jsonResponse({ applied: false, reason: "duplicate_event" });
      }
      throw err;
    }

    let planId: string | null = null;
    if (body.planCode) {
      const [plan] = await sql<{ id: string }[]>`
        SELECT id FROM subscription_plans WHERE code = ${body.planCode} LIMIT 1
      `;
      planId = plan?.id ?? null;
    }

    const graceEnds = body.gracePeriodEndsAt ? new Date(body.gracePeriodEndsAt) : null;
    const periodEnd = body.currentPeriodEnd ? new Date(body.currentPeriodEnd) : null;

    await withTenant(sql, body.tenantId, async (tx) => {
      const updated = await tx<{ id: string }[]>`
        UPDATE subscriptions
        SET status = ${body.status},
            stripe_subscription_id = ${body.stripeSubscriptionId},
            stripe_customer_id = COALESCE(${body.stripeCustomerId ?? null}, stripe_customer_id),
            plan_id = COALESCE(${planId}::uuid, plan_id),
            current_period_end = COALESCE(${periodEnd}, current_period_end),
            grace_period_ends_at = ${graceEnds},
            updated_at = NOW()
        WHERE tenant_id = ${body.tenantId}::uuid
        RETURNING id
      `;
      if (updated.length === 0) {
        throw new Error("subscription_not_found");
      }
    });

    await sql`
      UPDATE payment_events
      SET result = 'applied', processed_at = NOW()
      WHERE provider = ${body.provider} AND external_event_id = ${body.eventId}
    `;

    return jsonResponse({ applied: true, status: body.status });
  } catch (err) {
    if (err instanceof Error && err.message === "subscription_not_found") {
      return jsonResponse({ applied: false, reason: "subscription_not_found" }, 404);
    }
    throw err;
  } finally {
    await sql.end();
  }
}
