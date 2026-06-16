import type { JSONValue } from "postgres";
import { EVENT_TYPES } from "@inova-gastro-360/contracts";
import type { GatewayEnv } from "../types/env";
import { getSql, hasDatabase } from "./db";

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
    await sql`
      INSERT INTO outbox_events (id, tenant_id, event_type, payload, idempotency_key)
      VALUES (gen_random_uuid(), ${tenantId}::uuid, ${eventType}, ${sql.json(payload as JSONValue)}, ${idempotencyKey ?? null})
    `;

    if (env.MESSAGING_SERVICE) {
      await env.MESSAGING_SERVICE.fetch("http://internal/internal/publish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: eventType, payload }),
      });
    }
  } finally {
    await sql.end();
  }
}

export { EVENT_TYPES };
