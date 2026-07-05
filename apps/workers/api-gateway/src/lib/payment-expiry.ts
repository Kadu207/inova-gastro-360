import { getSql, hasDatabase, withTenant } from "./db";
import { publishOutboxEvent, EVENT_TYPES } from "./outbox";
import type { GatewayEnv } from "../types/env";

/** Marca intents PIX expirados e emite outbox order.payment_expired. */
export async function runPaymentExpiryJob(env: GatewayEnv): Promise<{ expired: number }> {
  if (!hasDatabase(env)) return { expired: 0 };

  const sql = getSql(env);
  try {
    const rows = await sql<
      { id: string; tenant_id: string; branch_id: string; order_id: string }[]
    >`
      SELECT id, tenant_id, branch_id, order_id
      FROM payment_intents
      WHERE status = 'pending'
        AND expires_at IS NOT NULL
        AND expires_at <= NOW()
      LIMIT 100
    `;

    for (const row of rows) {
      await withTenant(sql, row.tenant_id, async (tx) => {
        await tx`
          UPDATE payment_intents SET status = 'expired', updated_at = NOW()
          WHERE id = ${row.id}::uuid AND status = 'pending'
        `;
        await tx`
          UPDATE orders SET payment_status = 'expired', updated_at = NOW()
          WHERE id = ${row.order_id}::uuid AND payment_status = 'pending'
        `;
      });

      await publishOutboxEvent(
        env,
        row.tenant_id,
        EVENT_TYPES.ORDER_PAYMENT_EXPIRED,
        {
          orderId: row.order_id,
          tenantId: row.tenant_id,
          branchId: row.branch_id,
          paymentIntentId: row.id,
        },
        `payment-expired-${row.id}`,
      );
    }

    return { expired: rows.length };
  } finally {
    await sql.end();
  }
}
