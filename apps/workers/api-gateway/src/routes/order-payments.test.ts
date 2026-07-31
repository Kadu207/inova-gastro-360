import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { handlePayOrder, handleGetOrderPayment } from "./order-payments";
import { testEnv, DEMO_BRANCH_ID, testDatabaseUrl } from "../test/helpers";
import postgres from "postgres";
import { normalizeDatabaseUrl } from "../lib/db";

const ASAAS_KEY = "asaas_test_key_abcdefghijklmnopqrstuvwxyz";

function uniqueOrderNumber(): number {
  return 900_000_000 + Math.floor(Math.random() * 1_000_000);
}

describe("order-payments — contrato (mock Asaas)", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL, init?: RequestInit) => {
        const u = String(url);
        if (u.includes("/customers") && init?.method === "POST") {
          return new Response(JSON.stringify({ id: "cus_asaas_1" }), { status: 200 });
        }
        if (u.includes("/payments") && init?.method === "POST" && !u.includes("pixQrCode")) {
          return new Response(
            JSON.stringify({ id: "pay_asaas_123", status: "PENDING", invoiceUrl: "https://asaas.test/i/1" }),
            { status: 200 },
          );
        }
        if (u.includes("/pixQrCode")) {
          return new Response(
            JSON.stringify({ encodedImage: "base64qr", payload: "00020126PIX" }),
            { status: 200 },
          );
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

    const env = testEnv({ ASAAS_API_KEY: ASAAS_KEY, ASAAS_SANDBOX: "true" });
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

    const env = testEnv({ ASAAS_API_KEY: ASAAS_KEY });
    const res = await handleGetOrderPayment(
      new Request("https://api.test/"),
      env,
      DEMO_BRANCH_ID,
      order.id,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { paymentStatus: string };
    expect(body.paymentStatus).toBe("pending");
  });

  it("rejeita telefone inválido", async () => {
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
        'delivery', 'pending', '123', 1000, 'unpaid', NOW(), NOW()
      ) RETURNING id
    `;
    await sql.end();

    const env = testEnv({ ASAAS_API_KEY: ASAAS_KEY });
    const req = new Request("https://api.test/pay", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ method: "pix" }),
    });
    const res = await handlePayOrder(req, env, DEMO_BRANCH_ID, order.id);
    expect(res.status).toBe(400);
  });

  it("POST card retorna redirectUrl", async () => {
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
        'delivery', 'pending', '11977776666', 5000, 'unpaid', NOW(), NOW()
      ) RETURNING id
    `;
    await sql.end();

    const env = testEnv({ ASAAS_API_KEY: ASAAS_KEY, ASAAS_SANDBOX: "true" });
    const req = new Request("https://api.test/pay", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        method: "card",
        successUrl: "https://app.test/ok",
        cancelUrl: "https://app.test/cancel",
      }),
    });
    const res = await handlePayOrder(req, env, DEMO_BRANCH_ID, order.id);
    expect(res.status).toBe(201);
    const body = (await res.json()) as { card?: { redirectUrl?: string } };
    expect(body.card?.redirectUrl).toContain("http");
  });

  it("já pago retorna 409", async () => {
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
        'delivery', 'accepted', '11966665555', 2000, 'paid', NOW(), NOW()
      ) RETURNING id
    `;
    await sql.end();

    const env = testEnv({ ASAAS_API_KEY: ASAAS_KEY });
    const req = new Request("https://api.test/pay", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ method: "pix" }),
    });
    const res = await handlePayOrder(req, env, DEMO_BRANCH_ID, order.id);
    expect(res.status).toBe(409);
  });
});
