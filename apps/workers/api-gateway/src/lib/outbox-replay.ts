import type { GatewayEnv } from "../types/env";
import { getSql, hasDatabase } from "./db";
import { dispatchOutboxEvent, markOutboxPublished, type OutboxRow } from "./outbox-dispatch";

export interface OutboxFlushResult {
  processed: number;
  published: number;
  pending: number;
}

/** EMB-15 / resiliência: republica eventos com published_at IS NULL. */
export async function flushPendingOutbox(
  env: GatewayEnv,
  limit = 50,
): Promise<OutboxFlushResult> {
  if (!hasDatabase(env)) {
    return { processed: 0, published: 0, pending: 0 };
  }

  const sql = getSql(env);
  let published = 0;

  try {
    const rows = await sql<OutboxRow[]>`
      SELECT id, tenant_id, event_type, payload
      FROM outbox_events
      WHERE published_at IS NULL
      ORDER BY created_at ASC
      LIMIT ${limit}
    `;

    for (const row of rows) {
      const ok = await dispatchOutboxEvent(env, row);
      if (ok) {
        await markOutboxPublished(sql, row.id);
        published++;
      }
    }

    const [{ count }] = await sql<{ count: number }[]>`
      SELECT COUNT(*)::int AS count FROM outbox_events WHERE published_at IS NULL
    `;

    return { processed: rows.length, published, pending: count };
  } finally {
    await sql.end();
  }
}
