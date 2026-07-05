import postgres from "postgres";
import { describe, it, expect } from "vitest";
import { runPaymentExpiryJob } from "./payment-expiry";
import { normalizeDatabaseUrl } from "./db";
import { DEMO_BRANCH_ID, testDatabaseUrl, testEnv } from "../test/helpers";

function uniqueOrderNumber(): number {
  return 900_000_000 + Math.floor(Math.random() * 1_000_000);
}

async function probeDatabase(): Promise<boolean> {
  try {
    const probe = postgres(normalizeDatabaseUrl(testDatabaseUrl()), { max: 1, prepare: false });
    await probe`
      SELECT 1 FROM information_schema.tables
      WHERE table_name = 'payment_intents' LIMIT 1
    `;
    await probe.end();
    return true;
  } catch {
    return false;
  }
}

const dbReady = await probeDatabase();

describe.skipIf(!dbReady)("payment-expiry job", () => {
  it("marca intent expirado e order payment_status expired", async () => {
    const sql = postgres(normalizeDatabaseUrl(testDatabaseUrl()), { max: 1, prepare: false });
    const [tenant] = await sql<{ id: string }[]>`
      SELECT id FROM tenants WHERE slug = 'demo-burger' LIMIT 1
    `;
    if (!tenant) {
      await sql.end();
      return;
    }

    const [order] = await sql<{ id: string }[]>`
      INSERT INTO orders (
        id, tenant_id, branch_id, order_number, channel, status,
        customer_phone, total_cents, payment_status, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), ${tenant.id}::uuid, ${DEMO_BRANCH_ID}::uuid,
        ${uniqueOrderNumber()},
        'delivery', 'pending', '11999990000', 2000, 'pending', NOW(), NOW()
      ) RETURNING id
    `;

    const [intent] = await sql<{ id: string }[]>`
      INSERT INTO payment_intents (
        id, tenant_id, branch_id, order_id, provider, method, amount_cents,
        status, external_id, external_reference, expires_at, updated_at
      ) VALUES (
        gen_random_uuid(), ${tenant.id}::uuid, ${DEMO_BRANCH_ID}::uuid, ${order.id}::uuid,
        'mercadopago', 'pix', 2000, 'pending', 'exp-test-1', 'ref-exp-1',
        NOW() - INTERVAL '1 minute', NOW()
      ) RETURNING id
    `;
    await sql.end();

    const env = testEnv();
    const result = await runPaymentExpiryJob(env);
    expect(result.expired).toBeGreaterThanOrEqual(1);

    const verify = postgres(normalizeDatabaseUrl(testDatabaseUrl()), { max: 1, prepare: false });
    const [updatedIntent] = await verify<{ status: string }[]>`
      SELECT status FROM payment_intents WHERE id = ${intent.id}::uuid
    `;
    const [updatedOrder] = await verify<{ payment_status: string }[]>`
      SELECT payment_status FROM orders WHERE id = ${order.id}::uuid
    `;
    await verify.end();

    expect(updatedIntent?.status).toBe("expired");
    expect(updatedOrder?.payment_status).toBe("expired");
  });
});
