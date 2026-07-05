import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { handlePayOrder, handleGetOrderPayment } from "./order-payments";
import { testEnv, DEMO_BRANCH_ID, testDatabaseUrl } from "../test/helpers";
import postgres from "postgres";
import { normalizeDatabaseUrl } from "../lib/db";

const MP_TOKEN = "TEST-mp-token";

function uniqueOrderNumber(): number {
  return 900_000_000 + Math.floor(Math.random() * 1_000_000);
}

const mpPixResponse = {
  id: 12345,
  status: "pending",
  point_of_interaction: {
    transaction_data: {
      qr_code_base64: "base64qr",
      qr_code: "00020126PIX",
    },
  },
};

describe("order-payments — contrato (mock MP)", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL) => {
        if (String(url).includes("mercadopago.com")) {
          return new Response(JSON.stringify(mpPixResponse), { status: 201 });
        }
        return new Response("not found", { status: 404 });
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("POST /pay retorna 201 com QR e copyPaste", async () => {
    const sql = postgres(normalizeDatabaseUrl(testDatabaseUrl()), { max: 1, prepare: false });
    const [tenant] = await sql<{ id: string }[]>`SELECT id FROM tenants WHERE slug = 'demo-burger' LIMIT 1`;
    if (!tenant) {
      await sql.end();
      return;
    }

    const [order] = await sql<{ id: string }[]>`
      INSERT INTO orders (
        id, tenant_id, branch_id, order_number, channel, status,
        customer_name, customer_phone, total_cents, payment_status, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), ${tenant.id}::uuid, ${DEMO_BRANCH_ID}::uuid,
        ${uniqueOrderNumber()},
        'delivery', 'pending', 'Cliente Teste', '11999998888', 3200, 'unpaid', NOW(), NOW()
      ) RETURNING id
    `;
    await sql.end();

    const env = testEnv({ MERCADOPAGO_ACCESS_TOKEN: MP_TOKEN });
    const req = new Request(
      `https://api.test/api/v1/branches/${DEMO_BRANCH_ID}/orders/${order.id}/pay`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ method: "pix" }),
      },
    );

    const res = await handlePayOrder(req, env, DEMO_BRANCH_ID, order.id);
    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      method: string;
      pix?: { qrCodeBase64?: string; copyPaste?: string };
    };
    expect(body.method).toBe("pix");
    expect(body.pix?.qrCodeBase64).toBe("base64qr");
    expect(body.pix?.copyPaste).toBe("00020126PIX");
  });

  it("GET /payment reflete status pending após pay", async () => {
    const sql = postgres(normalizeDatabaseUrl(testDatabaseUrl()), { max: 1, prepare: false });
    const [tenant] = await sql<{ id: string }[]>`SELECT id FROM tenants WHERE slug = 'demo-burger' LIMIT 1`;
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
        'delivery', 'pending', '11988887777', 1500, 'pending', NOW(), NOW()
      ) RETURNING id
    `;
    await sql.end();

    const env = testEnv();
    const res = await handleGetOrderPayment(
      new Request("https://api.test"),
      env,
      DEMO_BRANCH_ID,
      order.id,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { paymentStatus: string };
    expect(body.paymentStatus).toBe("pending");
  });

  it("POST /pay method card retorna redirectUrl", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL) => {
        if (String(url).includes("checkout/preferences")) {
          return new Response(
            JSON.stringify({ id: "pref-1", init_point: "https://mp.test/checkout", sandbox_init_point: "https://mp.test/sandbox" }),
            { status: 201 },
          );
        }
        return new Response("not found", { status: 404 });
      }),
    );

    const sql = postgres(normalizeDatabaseUrl(testDatabaseUrl()), { max: 1, prepare: false });
    const [tenant] = await sql<{ id: string }[]>`SELECT id FROM tenants WHERE slug = 'demo-burger' LIMIT 1`;
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
        'delivery', 'pending', '11977776666', 4500, 'unpaid', NOW(), NOW()
      ) RETURNING id
    `;
    await sql.end();

    const env = testEnv({ MERCADOPAGO_ACCESS_TOKEN: MP_TOKEN, PAYMENTS_SANDBOX: "true" });
    const res = await handlePayOrder(
      new Request(`https://api.test/pay`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ method: "card" }),
      }),
      env,
      DEMO_BRANCH_ID,
      order.id,
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { method: string; card?: { redirectUrl?: string } };
    expect(body.method).toBe("card");
    expect(body.card?.redirectUrl).toContain("https://");
  });

  it("GET /payment retorna expired após intent expirado", async () => {
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
        'delivery', 'pending', '11966665555', 1800, 'expired', NOW(), NOW()
      ) RETURNING id
    `;
    await sql`
      INSERT INTO payment_intents (
        id, tenant_id, branch_id, order_id, provider, method, amount_cents,
        status, external_id, external_reference, expires_at, updated_at
      ) VALUES (
        gen_random_uuid(), ${tenant.id}::uuid, ${DEMO_BRANCH_ID}::uuid, ${order.id}::uuid,
        'mercadopago', 'pix', 1800, 'expired', 'exp-get-1', 'ref-get-1',
        NOW() - INTERVAL '5 minutes', NOW()
      )
    `;
    await sql.end();

    const env = testEnv();
    const res = await handleGetOrderPayment(
      new Request("https://api.test"),
      env,
      DEMO_BRANCH_ID,
      order.id,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { paymentStatus: string; expiresAt: string | null };
    expect(body.paymentStatus).toBe("expired");
    expect(body.expiresAt).toBeTruthy();
  });

  it("POST /pay após failed permite novo intent (sem duplicar pending)", async () => {
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
        'delivery', 'pending', '11955554444', 2500, 'failed', NOW(), NOW()
      ) RETURNING id
    `;
    await sql`
      INSERT INTO payment_intents (
        id, tenant_id, branch_id, order_id, provider, method, amount_cents,
        status, external_id, external_reference, updated_at
      ) VALUES (
        gen_random_uuid(), ${tenant.id}::uuid, ${DEMO_BRANCH_ID}::uuid, ${order.id}::uuid,
        'mercadopago', 'card', 2500, 'failed', 'card-fail-1', 'ref-fail-1', NOW()
      )
    `;
    await sql.end();

    const env = testEnv({ MERCADOPAGO_ACCESS_TOKEN: MP_TOKEN });
    const res = await handlePayOrder(
      new Request(`https://api.test/pay`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ method: "pix" }),
      }),
      env,
      DEMO_BRANCH_ID,
      order.id,
    );
    expect(res.status).toBe(201);

    const verify = postgres(normalizeDatabaseUrl(testDatabaseUrl()), { max: 1, prepare: false });
    const pending = await verify<{ id: string }[]>`
      SELECT id FROM payment_intents
      WHERE order_id = ${order.id}::uuid AND status = 'pending'
    `;
    await verify.end();
    expect(pending.length).toBe(1);
  });
});
