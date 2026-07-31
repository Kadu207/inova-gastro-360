import {
  ConsentInputSchema,
  ErasureRequestInputSchema,
  ErasureStatusUpdateSchema,
} from "@inova-gastro-360/validation";
import { jsonResponse, parseJsonBody } from "../lib";
import { getSql, setTenantContext } from "../lib/db";
import { writeAuditLog } from "../lib/audit-log";
import { requireRole } from "../middleware/auth";
import type { GatewayEnv } from "../types/env";
import type { JwtPayload } from "@inova-gastro-360/auth";

const DEMO_TENANT_SLUG = "demo-burger";

async function resolvePublicTenantId(
  sql: ReturnType<typeof getSql>,
  branchId?: string,
): Promise<string | null> {
  if (branchId) {
    const [branch] = await sql<{ tenant_id: string }[]>`
      SELECT tenant_id FROM branches WHERE id = ${branchId}::uuid AND is_active = true LIMIT 1
    `;
    if (branch) return branch.tenant_id;
  }
  const [tenant] = await sql<{ id: string }[]>`
    SELECT id FROM tenants WHERE slug = ${DEMO_TENANT_SLUG} LIMIT 1
  `;
  return tenant?.id ?? null;
}

/** POST /api/v1/lgpd/consent — público (cardápio) com subjectId do browser. */
export async function handlePostConsent(
  request: Request,
  env: GatewayEnv,
): Promise<Response> {
  const parsed = ConsentInputSchema.safeParse(await parseJsonBody(request));
  if (!parsed.success) return jsonResponse({ error: "validation_error" }, 400);

  const sql = getSql(env);
  try {
    const tenantId = await resolvePublicTenantId(sql, parsed.data.branchId);
    if (!tenantId) return jsonResponse({ error: "tenant_not_found" }, 404);

    await setTenantContext(sql, tenantId);
    const [row] = await sql<{ id: string }[]>`
      INSERT INTO consent_records (
        id, tenant_id, branch_id, subject_id, essential, analytics, marketing,
        ip_address, user_agent
      ) VALUES (
        gen_random_uuid(), ${tenantId}::uuid, ${parsed.data.branchId ?? null}::uuid,
        ${parsed.data.subjectId}, true, ${parsed.data.analytics}, ${parsed.data.marketing},
        ${request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")},
        ${request.headers.get("user-agent")}
      ) RETURNING id
    `;
    return jsonResponse({
      id: row.id,
      essential: true,
      analytics: parsed.data.analytics,
      marketing: parsed.data.marketing,
    }, 201);
  } finally {
    await sql.end();
  }
}

/** GET /api/v1/lgpd/export — titular autenticado exporta dados (JSON). */
export async function handleLgpdExport(
  _request: Request,
  env: GatewayEnv,
  user: JwtPayload,
): Promise<Response> {
  const sql = getSql(env);
  try {
    await setTenantContext(sql, user.tid);
    const [profile] = await sql`
      SELECT id, email, name, role, created_at FROM users
      WHERE id = ${user.sub}::uuid AND tenant_id = ${user.tid}::uuid LIMIT 1
    `;
    const consents = await sql`
      SELECT id, essential, analytics, marketing, created_at
      FROM consent_records
      WHERE tenant_id = ${user.tid}::uuid
        AND (user_id = ${user.sub}::uuid OR subject_id = ${user.email})
      ORDER BY created_at DESC LIMIT 50
    `;
    const orders = await sql`
      SELECT id, order_number, channel, status, total_cents, payment_status, created_at
      FROM orders
      WHERE tenant_id = ${user.tid}::uuid AND customer_phone IS NOT NULL
      ORDER BY created_at DESC LIMIT 100
    `;

    await writeAuditLog(sql, {
      tenantId: user.tid,
      userId: user.sub,
      action: "lgpd.export",
      resource: user.sub,
    });

    return jsonResponse({
      exportedAt: new Date().toISOString(),
      subject: profile ?? { id: user.sub, email: user.email },
      consents,
      ordersSample: orders,
    });
  } finally {
    await sql.end();
  }
}

export async function handleCreateErasureRequest(
  request: Request,
  env: GatewayEnv,
  user: JwtPayload,
): Promise<Response> {
  const gate = requireRole(user, "admin_cliente", "super_admin");
  if (!gate.ok) return gate.response;

  const parsed = ErasureRequestInputSchema.safeParse(await parseJsonBody(request));
  if (!parsed.success) return jsonResponse({ error: "validation_error" }, 400);

  const sql = getSql(env);
  try {
    await setTenantContext(sql, user.tid);
    const [row] = await sql<{ id: string; status: string }[]>`
      INSERT INTO erasure_requests (
        id, tenant_id, requested_by, subject_id, subject_type, status, reason, updated_at
      ) VALUES (
        gen_random_uuid(), ${user.tid}::uuid, ${user.sub}::uuid,
        ${parsed.data.subjectId}, ${parsed.data.subjectType}, 'pending',
        ${parsed.data.reason ?? null}, NOW()
      ) RETURNING id, status
    `;
    await writeAuditLog(sql, {
      tenantId: user.tid,
      userId: user.sub,
      action: "lgpd.erasure_request",
      resource: row.id,
      metadata: { subjectId: parsed.data.subjectId },
    });
    return jsonResponse({ id: row.id, status: row.status }, 201);
  } finally {
    await sql.end();
  }
}

export async function handleListErasureRequests(
  _request: Request,
  env: GatewayEnv,
  user: JwtPayload,
): Promise<Response> {
  const gate = requireRole(user, "admin_cliente", "super_admin");
  if (!gate.ok) return gate.response;
  const sql = getSql(env);
  try {
    await setTenantContext(sql, user.tid);
    const rows = await sql`
      SELECT id, subject_id, subject_type, status, reason, created_at, resolved_at
      FROM erasure_requests
      WHERE tenant_id = ${user.tid}::uuid
      ORDER BY created_at DESC LIMIT 100
    `;
    return jsonResponse({ requests: rows });
  } finally {
    await sql.end();
  }
}

export async function handleUpdateErasureRequest(
  request: Request,
  env: GatewayEnv,
  user: JwtPayload,
  requestId: string,
): Promise<Response> {
  const gate = requireRole(user, "admin_cliente", "super_admin");
  if (!gate.ok) return gate.response;
  const parsed = ErasureStatusUpdateSchema.safeParse(await parseJsonBody(request));
  if (!parsed.success) return jsonResponse({ error: "validation_error" }, 400);

  const sql = getSql(env);
  try {
    await setTenantContext(sql, user.tid);
    const done = parsed.data.status === "completed" || parsed.data.status === "rejected";
    const [row] = await sql<{ id: string; status: string }[]>`
      UPDATE erasure_requests
      SET status = ${parsed.data.status},
          reason = COALESCE(${parsed.data.reason ?? null}, reason),
          resolved_at = CASE WHEN ${done} THEN NOW() ELSE resolved_at END,
          resolved_by = CASE WHEN ${done} THEN ${user.sub}::uuid ELSE resolved_by END,
          updated_at = NOW()
      WHERE id = ${requestId}::uuid AND tenant_id = ${user.tid}::uuid
      RETURNING id, status
    `;
    if (!row) return jsonResponse({ error: "not_found" }, 404);

    await writeAuditLog(sql, {
      tenantId: user.tid,
      userId: user.sub,
      action: "lgpd.erasure_update",
      resource: row.id,
      metadata: { status: parsed.data.status },
    });
    return jsonResponse({ id: row.id, status: row.status });
  } finally {
    await sql.end();
  }
}
