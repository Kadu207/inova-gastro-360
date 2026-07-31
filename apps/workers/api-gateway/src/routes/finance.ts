import { z } from "zod";
import { jsonResponse, parseJsonBody } from "../lib";
import { getSql, setTenantContext, withTenant } from "../lib/db";
import { requireRole } from "../middleware/auth";
import type { GatewayEnv } from "../types/env";
import type { JwtPayload } from "@inova-gastro-360/auth";
import { writeAuditLog } from "../lib/audit-log";

const FINANCE_ROLES = ["admin_cliente", "super_admin", "gerente"] as const;

const OpenCashSchema = z.object({
  branchId: z.string().uuid(),
  openingCents: z.number().int().min(0).default(0),
  notes: z.string().max(500).optional(),
});

const CloseCashSchema = z.object({
  closingCents: z.number().int().min(0),
  notes: z.string().max(500).optional(),
});

const CashMoveSchema = z.object({
  amountCents: z.number().int().positive(),
  description: z.string().min(1).max(300),
});

const PayableSchema = z.object({
  branchId: z.string().uuid().optional(),
  description: z.string().min(1).max(300),
  amountCents: z.number().int().positive(),
  dueDate: z.string().datetime(),
  supplier: z.string().max(200).optional(),
});

const ReceivableSchema = z.object({
  branchId: z.string().uuid().optional(),
  description: z.string().min(1).max(300),
  amountCents: z.number().int().positive(),
  dueDate: z.string().datetime(),
  customer: z.string().max(200).optional(),
  orderId: z.string().uuid().optional(),
});

function roleGate(user: JwtPayload) {
  return requireRole(user, ...FINANCE_ROLES);
}

export async function handleOpenCash(
  request: Request,
  env: GatewayEnv,
  user: JwtPayload,
): Promise<Response> {
  const gate = roleGate(user);
  if (!gate.ok) return gate.response;
  const parsed = OpenCashSchema.safeParse(await parseJsonBody(request));
  if (!parsed.success) return jsonResponse({ error: "validation_error" }, 400);

  const sql = getSql(env);
  try {
    await setTenantContext(sql, user.tid);
    const [open] = await sql<{ id: string }[]>`
      SELECT id FROM cash_sessions
      WHERE tenant_id = ${user.tid}::uuid AND branch_id = ${parsed.data.branchId}::uuid
        AND status = 'open'
      LIMIT 1
    `;
    if (open) return jsonResponse({ error: "cash_already_open", sessionId: open.id }, 409);

    const [session] = await sql<{ id: string; opened_at: Date }[]>`
      INSERT INTO cash_sessions (
        id, tenant_id, branch_id, opened_by, status, opening_cents, notes, updated_at
      ) VALUES (
        gen_random_uuid(), ${user.tid}::uuid, ${parsed.data.branchId}::uuid,
        ${user.sub}::uuid, 'open', ${parsed.data.openingCents},
        ${parsed.data.notes ?? null}, NOW()
      ) RETURNING id, opened_at
    `;

    await sql`
      INSERT INTO ledger_entries (
        id, tenant_id, branch_id, cash_session_id, entry_type, amount_cents,
        description, created_by
      ) VALUES (
        gen_random_uuid(), ${user.tid}::uuid, ${parsed.data.branchId}::uuid,
        ${session.id}::uuid, 'opening', ${parsed.data.openingCents},
        'Abertura de caixa', ${user.sub}::uuid
      )
    `;

    await writeAuditLog(sql, {
      tenantId: user.tid,
      userId: user.sub,
      action: "cash.open",
      resource: session.id,
      metadata: { openingCents: parsed.data.openingCents },
    });

    return jsonResponse({
      sessionId: session.id,
      status: "open",
      openedAt: session.opened_at.toISOString(),
    }, 201);
  } finally {
    await sql.end();
  }
}

export async function handleCloseCash(
  request: Request,
  env: GatewayEnv,
  user: JwtPayload,
  sessionId: string,
): Promise<Response> {
  const gate = roleGate(user);
  if (!gate.ok) return gate.response;
  const parsed = CloseCashSchema.safeParse(await parseJsonBody(request));
  if (!parsed.success) return jsonResponse({ error: "validation_error" }, 400);

  const sql = getSql(env);
  try {
    await setTenantContext(sql, user.tid);
    const updated = await withTenant(sql, user.tid, async (tx) => {
      const [row] = await tx<{ id: string; status: string }[]>`
        UPDATE cash_sessions
        SET status = 'closed',
            closing_cents = ${parsed.data.closingCents},
            closed_by = ${user.sub}::uuid,
            closed_at = NOW(),
            notes = COALESCE(${parsed.data.notes ?? null}, notes),
            updated_at = NOW()
        WHERE id = ${sessionId}::uuid AND tenant_id = ${user.tid}::uuid AND status = 'open'
        RETURNING id, status
      `;
      return row;
    });
    if (!updated) return jsonResponse({ error: "session_not_found_or_closed" }, 404);

    await writeAuditLog(sql, {
      tenantId: user.tid,
      userId: user.sub,
      action: "cash.close",
      resource: sessionId,
      metadata: { closingCents: parsed.data.closingCents },
    });

    return jsonResponse({ sessionId, status: "closed" });
  } finally {
    await sql.end();
  }
}

export async function handleCashSangria(
  request: Request,
  env: GatewayEnv,
  user: JwtPayload,
  sessionId: string,
): Promise<Response> {
  return cashMove(request, env, user, sessionId, "sangria");
}

export async function handleCashSuprimento(
  request: Request,
  env: GatewayEnv,
  user: JwtPayload,
  sessionId: string,
): Promise<Response> {
  return cashMove(request, env, user, sessionId, "suprimento");
}

async function cashMove(
  request: Request,
  env: GatewayEnv,
  user: JwtPayload,
  sessionId: string,
  entryType: "sangria" | "suprimento",
): Promise<Response> {
  const gate = roleGate(user);
  if (!gate.ok) return gate.response;
  const parsed = CashMoveSchema.safeParse(await parseJsonBody(request));
  if (!parsed.success) return jsonResponse({ error: "validation_error" }, 400);

  const sql = getSql(env);
  try {
    await setTenantContext(sql, user.tid);
    const [session] = await sql<{ id: string; branch_id: string; status: string }[]>`
      SELECT id, branch_id, status FROM cash_sessions
      WHERE id = ${sessionId}::uuid AND tenant_id = ${user.tid}::uuid
      LIMIT 1
    `;
    if (!session || session.status !== "open") {
      return jsonResponse({ error: "session_not_open" }, 404);
    }

    const signed =
      entryType === "sangria" ? -Math.abs(parsed.data.amountCents) : Math.abs(parsed.data.amountCents);

    const [entry] = await sql<{ id: string }[]>`
      INSERT INTO ledger_entries (
        id, tenant_id, branch_id, cash_session_id, entry_type, amount_cents,
        description, created_by
      ) VALUES (
        gen_random_uuid(), ${user.tid}::uuid, ${session.branch_id}::uuid,
        ${sessionId}::uuid, ${entryType}, ${signed},
        ${parsed.data.description}, ${user.sub}::uuid
      ) RETURNING id
    `;

    await writeAuditLog(sql, {
      tenantId: user.tid,
      userId: user.sub,
      action: `cash.${entryType}`,
      resource: entry.id,
      metadata: { amountCents: signed, sessionId },
    });

    return jsonResponse({ entryId: entry.id, entryType, amountCents: signed }, 201);
  } finally {
    await sql.end();
  }
}

export async function handleGetOpenCash(
  _request: Request,
  env: GatewayEnv,
  user: JwtPayload,
  branchId: string,
): Promise<Response> {
  const gate = roleGate(user);
  if (!gate.ok) return gate.response;
  const sql = getSql(env);
  try {
    await setTenantContext(sql, user.tid);
    const [session] = await sql<
      {
        id: string;
        opening_cents: number;
        opened_at: Date;
        status: string;
      }[]
    >`
      SELECT id, opening_cents, opened_at, status FROM cash_sessions
      WHERE tenant_id = ${user.tid}::uuid AND branch_id = ${branchId}::uuid AND status = 'open'
      ORDER BY opened_at DESC LIMIT 1
    `;
    if (!session) return jsonResponse({ session: null });

    const [sum] = await sql<{ total: string }[]>`
      SELECT COALESCE(SUM(amount_cents), 0)::text AS total
      FROM ledger_entries
      WHERE cash_session_id = ${session.id}::uuid AND tenant_id = ${user.tid}::uuid
    `;

    return jsonResponse({
      session: {
        id: session.id,
        status: session.status,
        openingCents: session.opening_cents,
        openedAt: session.opened_at.toISOString(),
        ledgerTotalCents: Number(sum?.total ?? 0),
      },
    });
  } finally {
    await sql.end();
  }
}

export async function handleCreatePayable(
  request: Request,
  env: GatewayEnv,
  user: JwtPayload,
): Promise<Response> {
  const gate = roleGate(user);
  if (!gate.ok) return gate.response;
  const parsed = PayableSchema.safeParse(await parseJsonBody(request));
  if (!parsed.success) return jsonResponse({ error: "validation_error" }, 400);

  const sql = getSql(env);
  try {
    await setTenantContext(sql, user.tid);
    const [row] = await sql<{ id: string }[]>`
      INSERT INTO payables (
        id, tenant_id, branch_id, description, amount_cents, due_date, supplier, updated_at
      ) VALUES (
        gen_random_uuid(), ${user.tid}::uuid, ${parsed.data.branchId ?? null}::uuid,
        ${parsed.data.description}, ${parsed.data.amountCents},
        ${new Date(parsed.data.dueDate)}, ${parsed.data.supplier ?? null}, NOW()
      ) RETURNING id
    `;
    return jsonResponse({ id: row.id }, 201);
  } finally {
    await sql.end();
  }
}

export async function handleListPayables(
  _request: Request,
  env: GatewayEnv,
  user: JwtPayload,
): Promise<Response> {
  const gate = roleGate(user);
  if (!gate.ok) return gate.response;
  const sql = getSql(env);
  try {
    await setTenantContext(sql, user.tid);
    const rows = await sql`
      SELECT id, description, amount_cents, due_date, status, supplier, paid_at
      FROM payables WHERE tenant_id = ${user.tid}::uuid
      ORDER BY due_date ASC LIMIT 200
    `;
    return jsonResponse({ payables: rows });
  } finally {
    await sql.end();
  }
}

export async function handleCreateReceivable(
  request: Request,
  env: GatewayEnv,
  user: JwtPayload,
): Promise<Response> {
  const gate = roleGate(user);
  if (!gate.ok) return gate.response;
  const parsed = ReceivableSchema.safeParse(await parseJsonBody(request));
  if (!parsed.success) return jsonResponse({ error: "validation_error" }, 400);

  const sql = getSql(env);
  try {
    await setTenantContext(sql, user.tid);
    const [row] = await sql<{ id: string }[]>`
      INSERT INTO receivables (
        id, tenant_id, branch_id, description, amount_cents, due_date,
        customer, order_id, updated_at
      ) VALUES (
        gen_random_uuid(), ${user.tid}::uuid, ${parsed.data.branchId ?? null}::uuid,
        ${parsed.data.description}, ${parsed.data.amountCents},
        ${new Date(parsed.data.dueDate)}, ${parsed.data.customer ?? null},
        ${parsed.data.orderId ?? null}::uuid, NOW()
      ) RETURNING id
    `;
    return jsonResponse({ id: row.id }, 201);
  } finally {
    await sql.end();
  }
}

export async function handleListReceivables(
  _request: Request,
  env: GatewayEnv,
  user: JwtPayload,
): Promise<Response> {
  const gate = roleGate(user);
  if (!gate.ok) return gate.response;
  const sql = getSql(env);
  try {
    await setTenantContext(sql, user.tid);
    const rows = await sql`
      SELECT id, description, amount_cents, due_date, status, customer, order_id, paid_at
      FROM receivables WHERE tenant_id = ${user.tid}::uuid
      ORDER BY due_date ASC LIMIT 200
    `;
    return jsonResponse({ receivables: rows });
  } finally {
    await sql.end();
  }
}

export async function handleFinanceDre(
  request: Request,
  env: GatewayEnv,
  user: JwtPayload,
): Promise<Response> {
  const gate = roleGate(user);
  if (!gate.ok) return gate.response;
  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 86400_000);
  const toDate = to ? new Date(to) : new Date();

  const sql = getSql(env);
  try {
    await setTenantContext(sql, user.tid);
    const [sales] = await sql<{ total: string }[]>`
      SELECT COALESCE(SUM(total_cents), 0)::text AS total
      FROM orders
      WHERE tenant_id = ${user.tid}::uuid
        AND payment_status = 'paid'
        AND paid_at >= ${fromDate} AND paid_at <= ${toDate}
    `;
    const [pay] = await sql<{ total: string }[]>`
      SELECT COALESCE(SUM(amount_cents), 0)::text AS total
      FROM payables
      WHERE tenant_id = ${user.tid}::uuid AND status = 'paid'
        AND paid_at >= ${fromDate} AND paid_at <= ${toDate}
    `;
    const revenue = Number(sales?.total ?? 0);
    const expenses = Number(pay?.total ?? 0);
    return jsonResponse({
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
      revenueCents: revenue,
      expensesCents: expenses,
      resultCents: revenue - expenses,
    });
  } finally {
    await sql.end();
  }
}

export async function handleFinanceExport(
  request: Request,
  env: GatewayEnv,
  user: JwtPayload,
): Promise<Response> {
  const gate = roleGate(user);
  if (!gate.ok) return gate.response;
  const url = new URL(request.url);
  const format = url.searchParams.get("format") ?? "csv";
  const sql = getSql(env);
  try {
    await setTenantContext(sql, user.tid);
    const entries = await sql<
      { entry_type: string; amount_cents: number; description: string; created_at: Date }[]
    >`
      SELECT entry_type, amount_cents, description, created_at
      FROM ledger_entries
      WHERE tenant_id = ${user.tid}::uuid
      ORDER BY created_at DESC LIMIT 1000
    `;

    if (format === "json") {
      return jsonResponse({ entries });
    }

    // CSV (default) — XLSX/PDF simplificados como CSV UTF-8
    const header = "tipo,valor_centavos,descricao,criado_em\n";
    const lines = entries
      .map(
        (e) =>
          `${e.entry_type},${e.amount_cents},"${e.description.replace(/"/g, '""')}",${e.created_at.toISOString()}`,
      )
      .join("\n");
    const body = header + lines;
    return new Response(body, {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": 'attachment; filename="financeiro.csv"',
      },
    });
  } finally {
    await sql.end();
  }
}
