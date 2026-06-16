import { z } from "zod";
import type { JSONValue } from "postgres";
import { jsonResponse } from "../lib";
import { getSql } from "../lib/db";
import { publishOutboxEvent, EVENT_TYPES } from "../lib/outbox";
import type { GatewayEnv } from "../types/env";
import type { JwtPayload } from "@inova-gastro-360/auth";

const CreateOrderSchema = z.object({
  branchId: z.string().uuid(),
  channel: z.enum(["web", "balcao", "delivery"]).default("web"),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().min(1),
        notes: z.string().optional(),
      }),
    )
    .min(1),
});

const UpdateStatusSchema = z.object({
  status: z.enum([
    "pending",
    "accepted",
    "preparing",
    "ready",
    "out_for_delivery",
    "delivered",
    "cancelled",
  ]),
});

async function parseJsonBody(request: Request): Promise<unknown | null> {
  try {
    const text = await request.text();
    if (!text.trim()) return null;
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

export async function handleCreateOrder(request: Request, env: GatewayEnv, user?: JwtPayload): Promise<Response> {
  const raw = await parseJsonBody(request);
  const parsed = CreateOrderSchema.safeParse(raw);
  if (!parsed.success) {
    return jsonResponse({ error: "validation_error", details: parsed.error.flatten() }, 400);
  }

  const { branchId, channel, customerName, customerPhone, notes, items } = parsed.data;
  const tenantId = user?.tid;
  if (!tenantId) return jsonResponse({ error: "tenant_required" }, 400);

  const sql = getSql(env);

  try {
    const productIds = items.map((i) => i.productId);
    const products = await sql<
      { id: string; price_cents: number; name: string }[]
    >`
      SELECT id, price_cents, name FROM products
      WHERE branch_id = ${branchId}::uuid AND tenant_id = ${tenantId}::uuid
        AND id = ANY(${productIds}::uuid[]) AND is_available = true
    `;

    if (products.length !== items.length) {
      return jsonResponse({ error: "invalid_products" }, 400);
    }

    const priceMap = new Map(products.map((p) => [p.id, p.price_cents]));
    let totalCents = 0;
    const lineItems = items.map((item) => {
      const unit = priceMap.get(item.productId) ?? 0;
      const total = unit * item.quantity;
      totalCents += total;
      return { ...item, unitCents: unit, totalCents: total };
    });

    const [order] = await sql<{ id: string; order_number: number }[]>`
      WITH next_num AS (
        SELECT COALESCE(MAX(order_number), 1000) + 1 AS num
        FROM orders WHERE branch_id = ${branchId}::uuid
      )
      INSERT INTO orders (id, tenant_id, branch_id, order_number, channel, status, customer_name, customer_phone, notes, total_cents, updated_at)
      SELECT gen_random_uuid(), ${tenantId}::uuid, ${branchId}::uuid, next_num.num, ${channel}, 'pending',
             ${customerName ?? null}, ${customerPhone ?? null}, ${notes ?? null}, ${totalCents}, NOW()
      FROM next_num
      RETURNING id, order_number
    `;

    for (const item of lineItems) {
      await sql`
        INSERT INTO order_items (id, tenant_id, order_id, product_id, quantity, unit_cents, total_cents, notes)
        VALUES (gen_random_uuid(), ${tenantId}::uuid, ${order.id}::uuid, ${item.productId}::uuid,
                ${item.quantity}, ${item.unitCents}, ${item.totalCents}, ${item.notes ?? null})
      `;
    }

    await sql`
      INSERT INTO order_status_history (id, tenant_id, order_id, status, changed_by)
      VALUES (gen_random_uuid(), ${tenantId}::uuid, ${order.id}::uuid, 'pending', ${user?.sub ?? null}::uuid)
    `;

    await publishOutboxEvent(
      env,
      tenantId,
      EVENT_TYPES.ORDER_CREATED,
      { orderId: order.id, branchId, channel, totalCents, orderNumber: order.order_number },
      `order-created-${order.id}`,
    );

    await sql`
      INSERT INTO print_jobs (id, tenant_id, branch_id, order_id, sector, status, payload, updated_at)
      VALUES (
        gen_random_uuid(), ${tenantId}::uuid, ${branchId}::uuid, ${order.id}::uuid,
        'cozinha', 'pending',
        ${sql.json({ orderNumber: order.order_number, items: lineItems } as JSONValue)},
        NOW()
      )
    `;

    await publishOutboxEvent(
      env,
      tenantId,
      EVENT_TYPES.PRINT_JOB_REQUESTED,
      { orderId: order.id, branchId, sector: "cozinha" },
      `print-job-${order.id}-cozinha`,
    );

    return jsonResponse({ order: { id: order.id, orderNumber: order.order_number, status: "pending", totalCents } }, 201);
  } catch (err) {
    console.error("create_order_error", err);
    return jsonResponse({ error: "internal_error" }, 500);
  } finally {
    await sql.end();
  }
}

export async function handleListOrders(request: Request, env: GatewayEnv, user: JwtPayload): Promise<Response> {
  const url = new URL(request.url);
  const branchId = url.searchParams.get("branchId");
  const status = url.searchParams.get("status");

  if (!branchId) return jsonResponse({ error: "branch_id_required" }, 400);

  const sql = getSql(env);
  try {
    const orders = status
      ? await sql`
          SELECT id, order_number, channel, status, customer_name, customer_phone, total_cents, created_at
          FROM orders
          WHERE tenant_id = ${user.tid}::uuid AND branch_id = ${branchId}::uuid AND status = ${status}
          ORDER BY created_at DESC LIMIT 50
        `
      : await sql`
          SELECT id, order_number, channel, status, customer_name, customer_phone, total_cents, created_at
          FROM orders
          WHERE tenant_id = ${user.tid}::uuid AND branch_id = ${branchId}::uuid
          ORDER BY created_at DESC LIMIT 50
        `;
    return jsonResponse({ orders });
  } finally {
    await sql.end();
  }
}

export async function handleUpdateOrderStatus(
  request: Request,
  env: GatewayEnv,
  user: JwtPayload,
  orderId: string,
): Promise<Response> {
  const raw = await parseJsonBody(request);
  const parsed = UpdateStatusSchema.safeParse(raw);
  if (!parsed.success) {
    return jsonResponse({ error: "validation_error", details: parsed.error.flatten() }, 400);
  }

  const sql = getSql(env);
  try {
    const updated = await sql<{ id: string; branch_id: string; status: string }[]>`
      UPDATE orders SET status = ${parsed.data.status}, updated_at = NOW()
      WHERE id = ${orderId}::uuid AND tenant_id = ${user.tid}::uuid
      RETURNING id, branch_id, status
    `;

    if (!updated[0]) return jsonResponse({ error: "not_found" }, 404);

    await sql`
      INSERT INTO order_status_history (id, tenant_id, order_id, status, changed_by)
      VALUES (gen_random_uuid(), ${user.tid}::uuid, ${orderId}::uuid, ${parsed.data.status}, ${user.sub}::uuid)
    `;

    await publishOutboxEvent(
      env,
      user.tid,
      EVENT_TYPES.ORDER_STATUS_CHANGED,
      { orderId, branchId: updated[0].branch_id, status: parsed.data.status },
      `order-status-${orderId}-${parsed.data.status}`,
    );

    return jsonResponse({ order: updated[0] });
  } finally {
    await sql.end();
  }
}

export async function handleGetOrder(
  request: Request,
  env: GatewayEnv,
  user: JwtPayload,
  orderId: string,
): Promise<Response> {
  const sql = getSql(env);
  try {
    const orders = await sql`
      SELECT * FROM orders WHERE id = ${orderId}::uuid AND tenant_id = ${user.tid}::uuid LIMIT 1
    `;
    if (!orders[0]) return jsonResponse({ error: "not_found" }, 404);

    const items = await sql`
      SELECT oi.*, p.name as product_name
      FROM order_items oi JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id = ${orderId}::uuid
    `;

    return jsonResponse({ order: orders[0], items });
  } finally {
    await sql.end();
  }
}
