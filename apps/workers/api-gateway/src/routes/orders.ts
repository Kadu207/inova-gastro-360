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

const MAX_IDEMPOTENCY_KEY_LENGTH = 128;
const DEFAULT_PAGE_LIMIT = 20;
const MAX_PAGE_LIMIT = 50;
const ORDER_CHANNELS = ["web", "balcao", "delivery"] as const;
const MAX_SEARCH_LENGTH = 100;

type OrderSummary = {
  id: string;
  order_number: number;
  status: string;
  total_cents: number;
};

async function parseJsonBody(request: Request): Promise<unknown | null> {
  try {
    const text = await request.text();
    if (!text.trim()) return null;
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

export function parseIdempotencyKey(
  request: Request,
): { ok: true; key: string | null } | { ok: false; response: Response } {
  const raw = request.headers.get("Idempotency-Key");
  if (raw === null) return { ok: true, key: null };

  const key = raw.trim();
  if (!key) {
    return { ok: false, response: jsonResponse({ error: "validation_error", message: "Idempotency-Key vazio" }, 400) };
  }
  if (key.length > MAX_IDEMPOTENCY_KEY_LENGTH) {
    return {
      ok: false,
      response: jsonResponse({ error: "validation_error", message: "Idempotency-Key muito longo" }, 400),
    };
  }
  return { ok: true, key };
}

export function parseListPagination(
  url: URL,
): { ok: true; limit: number; page: number; offset: number } | { ok: false; response: Response } {
  const limitRaw = url.searchParams.get("limit");
  const pageRaw = url.searchParams.get("page");

  let limit = DEFAULT_PAGE_LIMIT;
  let page = 1;

  if (limitRaw !== null) {
    const parsed = Number.parseInt(limitRaw, 10);
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > MAX_PAGE_LIMIT) {
      return { ok: false, response: jsonResponse({ error: "invalid_limit" }, 400) };
    }
    limit = parsed;
  }

  if (pageRaw !== null) {
    const parsed = Number.parseInt(pageRaw, 10);
    if (!Number.isFinite(parsed) || parsed < 1) {
      return { ok: false, response: jsonResponse({ error: "invalid_page" }, 400) };
    }
    page = parsed;
  }

  return { ok: true, limit, page, offset: (page - 1) * limit };
}

export function parseListOrderFilters(
  url: URL,
):
  | { ok: true; status: string | null; channel: string | null; q: string | null; orderNumber: number | null }
  | { ok: false; response: Response } {
  const status = url.searchParams.get("status");
  const channel = url.searchParams.get("channel");
  const qRaw = url.searchParams.get("q");

  if (channel && !(ORDER_CHANNELS as readonly string[]).includes(channel)) {
    return { ok: false, response: jsonResponse({ error: "invalid_channel" }, 400) };
  }

  let q: string | null = null;
  if (qRaw !== null) {
    const trimmed = qRaw.trim();
    if (trimmed.length > MAX_SEARCH_LENGTH) {
      return { ok: false, response: jsonResponse({ error: "invalid_search" }, 400) };
    }
    if (trimmed) q = trimmed;
  }

  const orderNumber = q && /^\d+$/.test(q) ? Number.parseInt(q, 10) : null;

  return { ok: true, status, channel, q, orderNumber };
}

function orderCreatePayload(order: OrderSummary, idempotent = false) {
  return {
    order: {
      id: order.id,
      orderNumber: order.order_number,
      status: order.status,
      totalCents: order.total_cents,
    },
    ...(idempotent ? { idempotent: true } : {}),
  };
}

async function findOrderByIdempotencyKey(
  sql: ReturnType<typeof getSql>,
  tenantId: string,
  idempotencyKey: string,
): Promise<OrderSummary | undefined> {
  const rows = await sql<OrderSummary[]>`
    SELECT id, order_number, status, total_cents
    FROM orders
    WHERE tenant_id = ${tenantId}::uuid AND idempotency_key = ${idempotencyKey}
    LIMIT 1
  `;
  return rows[0];
}

export async function handleCreateOrder(request: Request, env: GatewayEnv, user?: JwtPayload): Promise<Response> {
  const idempotency = parseIdempotencyKey(request);
  if (!idempotency.ok) return idempotency.response;

  const raw = await parseJsonBody(request);
  const parsed = CreateOrderSchema.safeParse(raw);
  if (!parsed.success) {
    return jsonResponse({ error: "validation_error", details: parsed.error.flatten() }, 400);
  }

  const { branchId, channel, customerName, customerPhone, notes, items } = parsed.data;
  const sql = getSql(env);

  try {
    let tenantId = user?.tid;
    if (!tenantId) {
      if (!customerName?.trim() || !customerPhone?.trim()) {
        return jsonResponse(
          { error: "guest_contact_required", message: "Nome e telefone são obrigatórios para pedido sem login" },
          400,
        );
      }
      const [branch] = await sql<{ tenant_id: string }[]>`
        SELECT tenant_id FROM branches
        WHERE id = ${branchId}::uuid AND is_active = true
        LIMIT 1
      `;
      if (!branch) return jsonResponse({ error: "branch_not_found" }, 404);
      tenantId = branch.tenant_id;
    }
    if (idempotency.key) {
      const existing = await findOrderByIdempotencyKey(sql, tenantId, idempotency.key);
      if (existing) {
        return jsonResponse(orderCreatePayload(existing, true), 200);
      }
    }

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

    const productMap = new Map(products.map((p) => [p.id, p]));
    let totalCents = 0;
    const lineItems = items.map((item) => {
      const product = productMap.get(item.productId)!;
      const unit = product.price_cents;
      const total = unit * item.quantity;
      totalCents += total;
      return { ...item, productName: product.name, unitCents: unit, totalCents: total };
    });

    let order: { id: string; order_number: number; status: string; total_cents: number };

    try {
      const [inserted] = await sql<{ id: string; order_number: number; status: string; total_cents: number }[]>`
        WITH next_num AS (
          SELECT COALESCE(MAX(order_number), 1000) + 1 AS num
          FROM orders WHERE branch_id = ${branchId}::uuid
        )
        INSERT INTO orders (
          id, tenant_id, branch_id, order_number, channel, status,
          customer_name, customer_phone, notes, total_cents, idempotency_key, updated_at
        )
        SELECT gen_random_uuid(), ${tenantId}::uuid, ${branchId}::uuid, next_num.num, ${channel}, 'pending',
               ${customerName ?? null}, ${customerPhone ?? null}, ${notes ?? null}, ${totalCents},
               ${idempotency.key}, NOW()
        FROM next_num
        RETURNING id, order_number, status, total_cents
      `;
      order = inserted;
    } catch (err) {
      const pgCode = (err as { code?: string }).code;
      if (pgCode === "23505" && idempotency.key) {
        const existing = await findOrderByIdempotencyKey(sql, tenantId, idempotency.key);
        if (existing) return jsonResponse(orderCreatePayload(existing, true), 200);
      }
      throw err;
    }

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

    return jsonResponse(orderCreatePayload(order), 201);
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

  if (!branchId) return jsonResponse({ error: "branch_id_required" }, 400);

  const pagination = parseListPagination(url);
  if (!pagination.ok) return pagination.response;

  const listFilters = parseListOrderFilters(url);
  if (!listFilters.ok) return listFilters.response;

  const { limit, page, offset } = pagination;
  const { status, channel, q, orderNumber } = listFilters;
  const searchPattern = q ? `%${q}%` : null;

  const sql = getSql(env);
  try {
    const [{ count }] = await sql<{ count: number }[]>`
      SELECT COUNT(*)::int AS count FROM orders
      WHERE tenant_id = ${user.tid}::uuid AND branch_id = ${branchId}::uuid
        ${status ? sql`AND status = ${status}` : sql``}
        ${channel ? sql`AND channel = ${channel}` : sql``}
        ${q
          ? sql`AND (
              customer_name ILIKE ${searchPattern}
              OR customer_phone ILIKE ${searchPattern}
              ${orderNumber !== null ? sql`OR order_number = ${orderNumber}` : sql``}
            )`
          : sql``}
    `;

    const total = count ?? 0;
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    const orders = await sql`
      SELECT id, order_number, channel, status, customer_name, customer_phone, total_cents, created_at
      FROM orders
      WHERE tenant_id = ${user.tid}::uuid AND branch_id = ${branchId}::uuid
        ${status ? sql`AND status = ${status}` : sql``}
        ${channel ? sql`AND channel = ${channel}` : sql``}
        ${q
          ? sql`AND (
              customer_name ILIKE ${searchPattern}
              OR customer_phone ILIKE ${searchPattern}
              ${orderNumber !== null ? sql`OR order_number = ${orderNumber}` : sql``}
            )`
          : sql``}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    return jsonResponse({
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
    });
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
