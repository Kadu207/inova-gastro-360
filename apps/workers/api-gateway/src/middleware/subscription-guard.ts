import { getSql, hasDatabase, setTenantContext } from "../lib/db";
import type { GatewayEnv } from "../types/env";

export type SubscriptionWriteBlock =
  | { blocked: true; response: Response }
  | { blocked: false };

/** Bloqueia writes críticos quando assinatura está `restricted`. */
export async function checkSubscriptionAllowsWrites(
  env: GatewayEnv,
  tenantId: string,
): Promise<SubscriptionWriteBlock> {
  if (!hasDatabase(env)) return { blocked: false };

  const sql = getSql(env);
  try {
    await setTenantContext(sql, tenantId);
    const [sub] = await sql<{ status: string }[]>`
      SELECT status FROM subscriptions WHERE tenant_id = ${tenantId}::uuid LIMIT 1
    `;
    if (sub?.status === "restricted") {
      return {
        blocked: true,
        response: new Response(
          JSON.stringify({
            error: "subscription_restricted",
            message: "Assinatura inativa. Regularize o pagamento para continuar.",
          }),
          { status: 402, headers: { "content-type": "application/json" } },
        ),
      };
    }
    return { blocked: false };
  } finally {
    await sql.end();
  }
}
