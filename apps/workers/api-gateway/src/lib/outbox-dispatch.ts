import type { GatewayEnv } from "../types/env";

export interface OutboxRow {
  id: string;
  tenant_id: string;
  event_type: string;
  payload: Record<string, unknown>;
}

/** Publica evento no messaging-bus. Retorna false se indisponível ou erro. */
export async function dispatchOutboxEvent(env: GatewayEnv, row: OutboxRow): Promise<boolean> {
  if (!env.MESSAGING_SERVICE) return false;

  try {
    const res = await env.MESSAGING_SERVICE.fetch("http://internal/internal/publish", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: row.event_type, payload: row.payload }),
    });
    if (!res.ok) {
      console.error("outbox_dispatch_http_error", row.id, res.status);
      return false;
    }
    return true;
  } catch (err) {
    console.error("outbox_dispatch_failed", row.id, err);
    return false;
  }
}

export function isOutboxFlushAuthorized(request: Request, env: GatewayEnv): boolean {
  const secret = env.OUTBOX_FLUSH_SECRET;
  if (secret) {
    return request.headers.get("x-outbox-flush-secret") === secret;
  }
  // Produção CF: sem DATABASE_URL local — exige secret via wrangler secret put
  return Boolean(env.DATABASE_URL);
}

export async function markOutboxPublished(
  sql: import("postgres").Sql,
  id: string,
): Promise<void> {
  await sql`
    UPDATE outbox_events
    SET published_at = NOW()
    WHERE id = ${id}::uuid AND published_at IS NULL
  `;
}
