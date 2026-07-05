import { getSql, hasDatabase } from "./db";
import { publishOutboxEvent, EVENT_TYPES } from "./outbox";
import type { GatewayEnv } from "../types/env";

/**
 * Agentes de runtime embarcados (EMB) — tarefas periódicas que melhoram a
 * operação do software após o go-live. Idempotentes e seguros para rodar em
 * intervalo. Não dependem de LLM: são automações determinísticas de negócio.
 */

const STUCK_MINUTES = 30;

interface StuckOrderRow {
  id: string;
  tenant_id: string;
  branch_id: string;
  order_number: number;
  status: string;
  minutes_stuck: number;
}

/**
 * EMB-01 Order State Guardian — detecta pedidos presos em `pending`/`preparing`
 * além do SLA e emite `order.stuck` (uma vez por pedido, via idempotencyKey por
 * janela de tempo) para acionar alerta/painel.
 */
export async function runOrderStateGuardian(
  env: GatewayEnv,
  now: Date = new Date(),
): Promise<{ flagged: number }> {
  if (!hasDatabase(env)) return { flagged: 0 };

  const sql = getSql(env);
  try {
    const rows = await sql<StuckOrderRow[]>`
      SELECT id, tenant_id, branch_id, order_number, status,
             EXTRACT(EPOCH FROM (NOW() - updated_at)) / 60 AS minutes_stuck
      FROM orders
      WHERE status IN ('pending', 'preparing')
        AND updated_at < NOW() - (${STUCK_MINUTES} * INTERVAL '1 minute')
      ORDER BY updated_at ASC
      LIMIT 100
    `;

    for (const row of rows) {
      const window = `${now.getUTCFullYear()}${now.getUTCMonth()}${now.getUTCDate()}${now.getUTCHours()}`;
      await publishOutboxEvent(
        env,
        row.tenant_id,
        EVENT_TYPES.ORDER_STUCK,
        {
          orderId: row.id,
          branchId: row.branch_id,
          orderNumber: row.order_number,
          status: row.status,
          minutesStuck: Math.round(row.minutes_stuck),
        },
        `order-stuck-${row.id}-${window}`,
      );
    }

    return { flagged: rows.length };
  } finally {
    await sql.end();
  }
}

/**
 * EMB-02 Session Sweeper — remove sessões expiradas para manter a tabela enxuta
 * e reduzir superfície de refresh tokens antigos.
 */
export async function runSessionSweeper(env: GatewayEnv): Promise<{ removed: number }> {
  if (!hasDatabase(env)) return { removed: 0 };

  const sql = getSql(env);
  try {
    const removed = await sql<{ id: string }[]>`
      DELETE FROM sessions WHERE expires_at < NOW() RETURNING id
    `;
    return { removed: removed.length };
  } finally {
    await sql.end();
  }
}

interface TrialExpiringRow {
  id: string;
  tenant_id: string;
  trial_ends_at: Date;
  days_left: number;
}

/**
 * EMB-03 Trial Expiry Notifier — assinaturas em trial que expiram em ≤3 dias
 * emitem `subscription.trial_expiring` (idempotente por dia) para alerta/billing.
 */
export async function runTrialExpiryNotifier(
  env: GatewayEnv,
  now: Date = new Date(),
): Promise<{ notified: number }> {
  if (!hasDatabase(env)) return { notified: 0 };

  const sql = getSql(env);
  try {
    const rows = await sql<TrialExpiringRow[]>`
      SELECT id, tenant_id, trial_ends_at,
             EXTRACT(DAY FROM (trial_ends_at - NOW()))::int AS days_left
      FROM subscriptions
      WHERE status = 'trialing'
        AND trial_ends_at IS NOT NULL
        AND trial_ends_at > NOW()
        AND trial_ends_at <= NOW() + INTERVAL '3 days'
      LIMIT 100
    `;

    const dayKey = `${now.getUTCFullYear()}${now.getUTCMonth()}${now.getUTCDate()}`;
    for (const row of rows) {
      await publishOutboxEvent(
        env,
        row.tenant_id,
        EVENT_TYPES.SUBSCRIPTION_TRIAL_EXPIRING,
        {
          subscriptionId: row.id,
          trialEndsAt: row.trial_ends_at.toISOString(),
          daysLeft: row.days_left,
        },
        `trial-expiring-${row.id}-${dayKey}`,
      );
    }

    return { notified: rows.length };
  } finally {
    await sql.end();
  }
}

interface PastDueRow {
  id: string;
  tenant_id: string;
  grace_period_ends_at: Date | null;
}

/** EMB-03 extensão — alerta assinaturas past_due (idempotente por dia). */
export async function runPastDueNotifier(
  env: GatewayEnv,
  now: Date = new Date(),
): Promise<{ notified: number }> {
  if (!hasDatabase(env)) return { notified: 0 };

  const sql = getSql(env);
  try {
    const rows = await sql<PastDueRow[]>`
      SELECT id, tenant_id, grace_period_ends_at
      FROM subscriptions
      WHERE status = 'past_due'
      LIMIT 100
    `;

    const dayKey = `${now.getUTCFullYear()}${now.getUTCMonth()}${now.getUTCDate()}`;
    for (const row of rows) {
      await publishOutboxEvent(
        env,
        row.tenant_id,
        EVENT_TYPES.SUBSCRIPTION_PAST_DUE,
        {
          subscriptionId: row.id,
          gracePeriodEndsAt: row.grace_period_ends_at?.toISOString() ?? null,
        },
        `past-due-${row.id}-${dayKey}`,
      );

      if (row.grace_period_ends_at && row.grace_period_ends_at <= now) {
        await sql`
          UPDATE subscriptions SET status = 'restricted', updated_at = NOW()
          WHERE id = ${row.id}::uuid AND status = 'past_due'
        `;
      }
    }

    return { notified: rows.length };
  } finally {
    await sql.end();
  }
}
