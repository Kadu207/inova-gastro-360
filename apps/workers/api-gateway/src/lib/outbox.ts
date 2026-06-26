import type { JSONValue } from "postgres";
import { EVENT_TYPES } from "@inova-gastro-360/contracts";
import type { GatewayEnv } from "../types/env";
import { getSql, hasDatabase } from "./db";
import { dispatchOutboxEvent, markOutboxPublished } from "./outbox-dispatch";

export async function publishOutboxEvent(
  env: GatewayEnv,
  tenantId: string,
  eventType: string,
  payload: Record<string, unknown>,
  idempotencyKey?: string,
): Promise<void> {
  if (!hasDatabase(env)) return;

  const sql = getSql(env);
  try {
    const [inserted] = await sql<
      { id: string; tenant_id: string; event_type: string; payload: Record<string, unknown> }[]
    >`
      INSERT INTO outbox_events (id, tenant_id, event_type, payload, idempotency_key)
      VALUES (
        gen_random_uuid(),
        ${tenantId}::uuid,
        ${eventType},
        ${sql.json(payload as JSONValue)},
        ${idempotencyKey ?? null}
      )
      RETURNING id, tenant_id, event_type, payload
    `;

    const dispatched = await dispatchOutboxEvent(env, inserted);
    if (dispatched) {
      await markOutboxPublished(sql, inserted.id);
    }
  } finally {
    await sql.end();
  }
}

export { EVENT_TYPES };
