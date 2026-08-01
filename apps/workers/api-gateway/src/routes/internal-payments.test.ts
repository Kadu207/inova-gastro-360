import postgres from "postgres";
import { describe, it, expect, beforeAll } from "vitest";
import {
  handleApplyOrderPayment,
  isInternalAuthorized,
} from "./internal-payments";
import { normalizeDatabaseUrl } from "../lib/db";
import {
  DEMO_BRANCH_ID,
  DEMO_PRODUCT_ID,
  TENANT_B,
  testDatabaseUrl,
  testEnv,
} from "../test/helpers";

const INTERNAL_SECRET = "test-internal-secret-min-32-chars";

function uniqueOrderNumber(): number {
  return 900_000_000 + Math.floor(Math.random() * 1_000_000);
}

function applyOrderRequest(body: unknown, secret = INTERNAL_SECRET): Request {
  return new Request("https://api.test/internal/payments/apply-order", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-internal-secret": secret,
    },
    body: JSON.stringify(body),
  });
}

async function probeDatabase(): Promise<boolean> {
  try {
    const probe = postgres(normalizeDatabaseUrl(testDatabaseUrl()), { max: 1, prepare: false });
    await probe`SELECT 1`;
    await probe.end();
    return true;
  } catch {
    return false;
  }
}

describe("internal-payments — auth e validação (sem DB)", () => {
  it("isInternalAuthorized exige secret em produção", () => {
    const req = new Request("https://api.test", {
      headers: { "x-internal-secret": "wrong" },
    });
    expect(
      isInternalAuthorized(req, {
        ENVIRONMENT: "production",
        INTERNAL_SHARED_SECRET: INTERNAL_SECRET,
      }),
    ).toBe(false);
  });

  it("rejeita apply-order sem secret em produção (403)", async () => {
    const res = await handleApplyOrderPayment(
      applyOrderRequest(
        {
          provider: "mercadopago",
          externalPaymentId: "mp-1",
          externalEventId: "evt-1",
          orderId: "00000000-0000-4000-8000-000000000099",
          tenantId: "00000000-0000-4000-8000-000000000001",
          amountCents: 1000,
          method: "pix",
        },
        "wrong-secret",
      ),
      testEnv({ ENVIRONMENT: "production", INTERNAL_SHARED_SECRET: INTERNAL_SECRET }),
    );
    expect(res.status).toBe(403);
  });

  it("rejeita payload inválido (400)", async () => {
    const res = await handleApplyOrderPayment(
      applyOrderRequest({ orderId: "not-uuid" }),
      testEnv({
        ENVIRONMENT: "test",
        INTERNAL_SHARED_SECRET: INTERNAL_SECRET,
        DATABASE_URL: undefined,
        HYPERDRIVE: undefined,
      }),
    );
    expect(res.status).toBe(400);
  });
});

const dbReady = await probeDatabase();
const migrationReady = dbReady
  ? await (async () => {
      try {
        const sql = postgres(normalizeDatabaseUrl(testDatabaseUrl()), {
          max: 1,
          prepare: false,
        });
        await sql`
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'payment_events' AND column_name = 'external_event_id'
          LIMIT 1
        `;
        await sql.end();
        return true;
      } catch {
        return false;
      }
    })()
  : false;

describe.skipIf(!migrationReady)("internal-payments — idempotência e cross-tenant", () => {
  let demoTenantId = "";
  let demoBranchId = DEMO_BRANCH_ID;
  let orderId = "";
  const eventId = `test-evt-${Date.now()}`;

  beforeAll(async () => {
    const sql = postgres(normalizeDatabaseUrl(testDatabaseUrl()), { max: 1, prepare: false });
    const [tenant] = await sql<{ id: string }[]>`
      SELECT id FROM tenants WHERE slug = 'demo-burger' LIMIT 1
    `;
    demoTenantId = tenant?.id ?? "";
    if (!demoTenantId) {
      await sql.end();
      return;
    }

    const [order] = await sql<{ id: string }[]>`
      INSERT INTO orders (
        id, tenant_id, branch_id, order_number, channel, status,
        total_cents, payment_status, created_at, updated_at
      )
      VALUES (
        gen_random_uuid(),
        ${demoTenantId}::uuid,
        ${demoBranchId}::uuid,
        ${uniqueOrderNumber()},
        'web',
        'pending',
        2500,
        'pending',
        NOW(),
        NOW()
      )
      RETURNING id
    `;
    orderId = order.id;

    await sql`
      INSERT INTO order_items (
        id, tenant_id, order_id, product_id, quantity, unit_cents, total_cents
      ) VALUES (
        gen_random_uuid(),
        ${demoTenantId}::uuid,
        ${orderId}::uuid,
        ${DEMO_PRODUCT_ID}::uuid,
        1,
        2500,
        2500
      )
    `;
    await sql.end();
  });

  it("aplica pagamento e é idempotente no mesmo externalEventId", async () => {
    const env = testEnv({
      ENVIRONMENT: "test",
      INTERNAL_SHARED_SECRET: INTERNAL_SECRET,
    });
    const body = {
      provider: "mercadopago",
      externalPaymentId: "mp-pay-123",
      externalEventId: eventId,
      orderId,
      tenantId: demoTenantId,
      amountCents: 2500,
      method: "pix" as const,
    };

    const first = await handleApplyOrderPayment(applyOrderRequest(body), env);
    expect(first.status).toBe(200);
    const firstJson = (await first.json()) as { applied: boolean; paymentStatus?: string };
    expect(firstJson.applied).toBe(true);
    expect(firstJson.paymentStatus).toBe("paid");

    const second = await handleApplyOrderPayment(applyOrderRequest(body), env);
    expect(second.status).toBe(200);
    const secondJson = (await second.json()) as { applied: boolean; reason: string };
    expect(secondJson.applied).toBe(false);
    expect(secondJson.reason).toBe("already_paid");
  });

  it("spec 005: pagamento confirmado gera receivable quitado + lançamento no ledger", async () => {
    const sql = postgres(normalizeDatabaseUrl(testDatabaseUrl()), { max: 1, prepare: false });
    const [receivable] = await sql<
      { id: string; status: string; amount_cents: number; order_id: string }[]
    >`
      SELECT id, status, amount_cents, order_id FROM receivables
      WHERE order_id = ${orderId}::uuid AND tenant_id = ${demoTenantId}::uuid
      LIMIT 1
    `;
    expect(receivable?.status).toBe("received");
    expect(receivable?.amount_cents).toBe(2500);

    const [ledgerEntry] = await sql<{ entry_type: string; amount_cents: number }[]>`
      SELECT entry_type, amount_cents FROM ledger_entries
      WHERE reference_type = 'order' AND reference_id = ${orderId}::uuid
        AND tenant_id = ${demoTenantId}::uuid
      LIMIT 1
    `;
    expect(ledgerEntry?.entry_type).toBe("sale");
    expect(ledgerEntry?.amount_cents).toBe(2500);
    await sql.end();
  });

  it("não aplica pagamento cross-tenant (tenant errado → order_not_found)", async () => {
    const env = testEnv({
      ENVIRONMENT: "test",
      INTERNAL_SHARED_SECRET: INTERNAL_SECRET,
    });

    const res = await handleApplyOrderPayment(
      applyOrderRequest({
        provider: "mercadopago",
        externalPaymentId: "mp-cross",
        externalEventId: `cross-${Date.now()}`,
        orderId,
        tenantId: TENANT_B.tenantId,
        amountCents: 2500,
        method: "pix",
      }),
      env,
    );

    expect(res.status).toBe(404);
    const json = (await res.json()) as { applied: boolean; reason: string };
    expect(json.applied).toBe(false);
    expect(json.reason).toBe("order_not_found");
  });

  it("rejeita valor divergente (amount_mismatch)", async () => {
    const env = testEnv({
      ENVIRONMENT: "test",
      INTERNAL_SHARED_SECRET: INTERNAL_SECRET,
    });

    const sql = postgres(normalizeDatabaseUrl(testDatabaseUrl()), { max: 1, prepare: false });
    const [order] = await sql<{ id: string }[]>`
      INSERT INTO orders (
        id, tenant_id, branch_id, order_number, channel, status,
        total_cents, payment_status, created_at, updated_at
      )
      VALUES (
        gen_random_uuid(),
        ${demoTenantId}::uuid,
        ${demoBranchId}::uuid,
        ${uniqueOrderNumber()},
        'web',
        'pending',
        3000,
        'unpaid',
        NOW(),
        NOW()
      )
      RETURNING id
    `;
    await sql.end();

    const res = await handleApplyOrderPayment(
      applyOrderRequest({
        provider: "mercadopago",
        externalPaymentId: "mp-wrong-amt",
        externalEventId: `mismatch-${Date.now()}`,
        orderId: order.id,
        tenantId: demoTenantId,
        amountCents: 9999,
        method: "pix",
      }),
      env,
    );

    expect(res.status).toBe(409);
    const json = (await res.json()) as { reason: string; expected?: number };
    expect(json.reason).toBe("amount_mismatch");
    expect(json.expected).toBe(3000);
  });

  it("apply-subscription past_due define grace period", async () => {
    const env = testEnv({
      ENVIRONMENT: "test",
      INTERNAL_SHARED_SECRET: INTERNAL_SECRET,
    });
    const sql = postgres(normalizeDatabaseUrl(testDatabaseUrl()), { max: 1, prepare: false });
    const [plan] = await sql<{ id: string }[]>`
      SELECT id FROM subscription_plans WHERE code = 'starter' LIMIT 1
    `;
    if (!plan) {
      await sql.end();
      return;
    }
    const [existingSub] = await sql<{ id: string }[]>`
      SELECT id FROM subscriptions WHERE tenant_id = ${demoTenantId}::uuid LIMIT 1
    `;
    if (!existingSub) {
      await sql`
        INSERT INTO subscriptions (
          id, tenant_id, plan_id, status, created_at, updated_at
        ) VALUES (
          gen_random_uuid(),
          ${demoTenantId}::uuid,
          ${plan.id}::uuid,
          'active',
          NOW(),
          NOW()
        )
      `;
    }
    await sql.end();

    const { handleApplySubscriptionPayment } = await import("./internal-payments");
    const grace = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const res = await handleApplySubscriptionPayment(
      new Request("https://api.test/internal/payments/apply-subscription", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-internal-secret": INTERNAL_SECRET,
        },
        body: JSON.stringify({
          provider: "stripe",
          eventId: `past-due-${Date.now()}`,
          tenantId: demoTenantId,
          stripeSubscriptionId: "sub_test_past_due",
          status: "past_due",
          gracePeriodEndsAt: grace,
        }),
      }),
      env,
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as { applied: boolean; status: string };
    expect(json.applied).toBe(true);
    expect(json.status).toBe("past_due");
  });
});
