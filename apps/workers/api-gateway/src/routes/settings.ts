import type { JwtPayload } from "@inova-gastro-360/auth";
import { hashPassword } from "@inova-gastro-360/auth";
import {
  CreateBranchSchema,
  CreateSettingsUserSchema,
  PatchBranchSchema,
  PatchCompanySchema,
  PatchSettingsUserSchema,
} from "@inova-gastro-360/validation";
import { jsonResponse, parseJsonBody } from "../lib";
import { getSql, withTenant } from "../lib/db";
import { requireRole } from "../middleware/auth";
import type { GatewayEnv } from "../types/env";

function requireSettingsAdmin(user: JwtPayload) {
  return requireRole(user, "admin_cliente", "super_admin");
}

export async function handleGetCompany(
  _request: Request,
  env: GatewayEnv,
  user: JwtPayload,
): Promise<Response> {
  const roleCheck = requireSettingsAdmin(user);
  if (!roleCheck.ok) return roleCheck.response;

  const sql = getSql(env);
  try {
    return await withTenant(sql, user.tid, async (tx) => {
      const rows = await tx<
        {
          id: string;
          trade_name: string;
          legal_name: string | null;
          document_number: string | null;
          phone: string | null;
        }[]
      >`
        SELECT id, trade_name, legal_name, document_number, phone
        FROM companies WHERE tenant_id = ${user.tid}::uuid
        ORDER BY created_at ASC LIMIT 1
      `;
      const c = rows[0];
      if (!c) return jsonResponse({ error: "not_found" }, 404);
      return jsonResponse({
        company: {
          id: c.id,
          tradeName: c.trade_name,
          legalName: c.legal_name,
          documentNumber: c.document_number,
          phone: c.phone,
        },
      });
    });
  } finally {
    await sql.end();
  }
}

export async function handlePatchCompany(
  request: Request,
  env: GatewayEnv,
  user: JwtPayload,
): Promise<Response> {
  const roleCheck = requireSettingsAdmin(user);
  if (!roleCheck.ok) return roleCheck.response;

  const raw = await parseJsonBody(request);
  if (raw === null) return jsonResponse({ error: "invalid_json" }, 400);
  const parsed = PatchCompanySchema.safeParse(raw);
  if (!parsed.success) {
    return jsonResponse({ error: "validation_error", details: parsed.error.flatten() }, 400);
  }

  const sql = getSql(env);
  try {
    return await withTenant(sql, user.tid, async (tx) => {
      const existing = await tx<{ id: string }[]>`
        SELECT id FROM companies WHERE tenant_id = ${user.tid}::uuid ORDER BY created_at ASC LIMIT 1
      `;
      if (!existing[0]) return jsonResponse({ error: "not_found" }, 404);

      const p = parsed.data;
      await tx`
        UPDATE companies SET
          trade_name = COALESCE(${p.tradeName ?? null}, trade_name),
          legal_name = COALESCE(${p.legalName ?? null}, legal_name),
          document_number = COALESCE(${p.documentNumber ?? null}, document_number),
          phone = CASE WHEN ${p.phone === undefined} THEN phone ELSE ${p.phone} END,
          updated_at = NOW()
        WHERE id = ${existing[0].id}::uuid
      `;
      return jsonResponse({ ok: true });
    });
  } finally {
    await sql.end();
  }
}

export async function handleListBranches(
  _request: Request,
  env: GatewayEnv,
  user: JwtPayload,
): Promise<Response> {
  const sql = getSql(env);
  try {
    return await withTenant(sql, user.tid, async (tx) => {
      const isAdmin = user.role === "admin_cliente" || user.role === "super_admin";
      const rows = isAdmin
        ? await tx<
            {
              id: string;
              name: string;
              address: string | null;
              timezone: string;
              is_active: boolean;
            }[]
          >`
            SELECT b.id, b.name, b.address, b.timezone, b.is_active
            FROM branches b
            WHERE b.tenant_id = ${user.tid}::uuid
            ORDER BY b.name ASC
          `
        : await tx<
            {
              id: string;
              name: string;
              address: string | null;
              timezone: string;
              is_active: boolean;
            }[]
          >`
            SELECT b.id, b.name, b.address, b.timezone, b.is_active
            FROM branches b
            INNER JOIN user_branch_access uba ON uba.branch_id = b.id AND uba.user_id = ${user.sub}::uuid
            WHERE b.tenant_id = ${user.tid}::uuid
            ORDER BY b.name ASC
          `;
      return jsonResponse({
        branches: rows.map((b) => ({
          id: b.id,
          name: b.name,
          address: b.address,
          timezone: b.timezone,
          isActive: b.is_active,
        })),
      });
    });
  } finally {
    await sql.end();
  }
}

export async function handleCreateBranch(
  request: Request,
  env: GatewayEnv,
  user: JwtPayload,
): Promise<Response> {
  const roleCheck = requireSettingsAdmin(user);
  if (!roleCheck.ok) return roleCheck.response;

  const raw = await parseJsonBody(request);
  if (raw === null) return jsonResponse({ error: "invalid_json" }, 400);
  const parsed = CreateBranchSchema.safeParse(raw);
  if (!parsed.success) {
    return jsonResponse({ error: "validation_error", details: parsed.error.flatten() }, 400);
  }

  const sql = getSql(env);
  try {
    return await withTenant(sql, user.tid, async (tx) => {
      const companies = await tx<{ id: string }[]>`
        SELECT id FROM companies WHERE tenant_id = ${user.tid}::uuid ORDER BY created_at ASC LIMIT 1
      `;
      if (!companies[0]) return jsonResponse({ error: "company_not_found" }, 404);

      const [branch] = await tx<{ id: string }[]>`
        INSERT INTO branches (id, tenant_id, company_id, name, address, timezone, updated_at)
        VALUES (
          gen_random_uuid(), ${user.tid}::uuid, ${companies[0].id}::uuid,
          ${parsed.data.name}, ${parsed.data.address ?? null}, ${parsed.data.timezone}, NOW()
        )
        RETURNING id
      `;
      return jsonResponse({ branch: { id: branch.id } }, 201);
    });
  } finally {
    await sql.end();
  }
}

export async function handlePatchBranch(
  request: Request,
  env: GatewayEnv,
  user: JwtPayload,
  branchId: string,
): Promise<Response> {
  const roleCheck = requireSettingsAdmin(user);
  if (!roleCheck.ok) return roleCheck.response;

  const raw = await parseJsonBody(request);
  if (raw === null) return jsonResponse({ error: "invalid_json" }, 400);
  const parsed = PatchBranchSchema.safeParse(raw);
  if (!parsed.success) {
    return jsonResponse({ error: "validation_error", details: parsed.error.flatten() }, 400);
  }

  const sql = getSql(env);
  try {
    return await withTenant(sql, user.tid, async (tx) => {
      const p = parsed.data;
      const updated = await tx<{ id: string }[]>`
        UPDATE branches SET
          name = COALESCE(${p.name ?? null}, name),
          address = CASE WHEN ${p.address === undefined} THEN address ELSE ${p.address} END,
          timezone = COALESCE(${p.timezone ?? null}, timezone),
          is_active = COALESCE(${p.isActive ?? null}, is_active),
          updated_at = NOW()
        WHERE id = ${branchId}::uuid AND tenant_id = ${user.tid}::uuid
        RETURNING id
      `;
      if (!updated[0]) return jsonResponse({ error: "not_found" }, 404);
      return jsonResponse({ ok: true });
    });
  } finally {
    await sql.end();
  }
}

export async function handleListUsers(
  _request: Request,
  env: GatewayEnv,
  user: JwtPayload,
): Promise<Response> {
  const roleCheck = requireSettingsAdmin(user);
  if (!roleCheck.ok) return roleCheck.response;

  const sql = getSql(env);
  try {
    return await withTenant(sql, user.tid, async (tx) => {
      const rows = await tx<
        {
          id: string;
          email: string;
          name: string;
          role: string;
          is_active: boolean;
          branch_ids: string[] | null;
        }[]
      >`
        SELECT u.id, u.email, u.name, u.role, u.is_active,
          COALESCE(
            (SELECT array_agg(uba.branch_id::text) FROM user_branch_access uba WHERE uba.user_id = u.id),
            ARRAY[]::text[]
          ) AS branch_ids
        FROM users u
        WHERE u.tenant_id = ${user.tid}::uuid
        ORDER BY u.name ASC
      `;
      return jsonResponse({
        users: rows.map((u) => ({
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.role,
          isActive: u.is_active,
          branchIds: u.branch_ids ?? [],
        })),
      });
    });
  } finally {
    await sql.end();
  }
}

export async function handleCreateUser(
  request: Request,
  env: GatewayEnv,
  user: JwtPayload,
): Promise<Response> {
  const roleCheck = requireSettingsAdmin(user);
  if (!roleCheck.ok) return roleCheck.response;

  const raw = await parseJsonBody(request);
  if (raw === null) return jsonResponse({ error: "invalid_json" }, 400);
  const parsed = CreateSettingsUserSchema.safeParse(raw);
  if (!parsed.success) {
    return jsonResponse({ error: "validation_error", details: parsed.error.flatten() }, 400);
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const sql = getSql(env);
  try {
    return await withTenant(sql, user.tid, async (tx) => {
      const branchesOk = await tx<{ c: string }[]>`
        SELECT COUNT(*)::text AS c FROM branches
        WHERE tenant_id = ${user.tid}::uuid
          AND id = ANY(${parsed.data.branchIds}::uuid[])
      `;
      if (Number(branchesOk[0]?.c ?? 0) !== parsed.data.branchIds.length) {
        return jsonResponse({ error: "invalid_branches" }, 400);
      }

      try {
        const [created] = await tx<{ id: string }[]>`
          INSERT INTO users (id, tenant_id, email, name, password_hash, role, updated_at)
          VALUES (
            gen_random_uuid(), ${user.tid}::uuid, ${parsed.data.email}, ${parsed.data.name},
            ${passwordHash}, ${parsed.data.role}, NOW()
          )
          RETURNING id
        `;
        for (const branchId of parsed.data.branchIds) {
          await tx`
            INSERT INTO user_branch_access (id, user_id, branch_id, tenant_id)
            VALUES (gen_random_uuid(), ${created.id}::uuid, ${branchId}::uuid, ${user.tid}::uuid)
          `;
        }
        return jsonResponse({ user: { id: created.id } }, 201);
      } catch (err) {
        const pgCode = (err as { code?: string }).code;
        if (pgCode === "23505") return jsonResponse({ error: "email_conflict" }, 409);
        throw err;
      }
    });
  } finally {
    await sql.end();
  }
}

export async function handlePatchUser(
  request: Request,
  env: GatewayEnv,
  user: JwtPayload,
  userId: string,
): Promise<Response> {
  const roleCheck = requireSettingsAdmin(user);
  if (!roleCheck.ok) return roleCheck.response;

  const raw = await parseJsonBody(request);
  if (raw === null) return jsonResponse({ error: "invalid_json" }, 400);
  const parsed = PatchSettingsUserSchema.safeParse(raw);
  if (!parsed.success) {
    return jsonResponse({ error: "validation_error", details: parsed.error.flatten() }, 400);
  }

  const sql = getSql(env);
  try {
    return await withTenant(sql, user.tid, async (tx) => {
      const p = parsed.data;
      const passwordHash = p.password ? await hashPassword(p.password) : null;
      const updated = await tx<{ id: string }[]>`
        UPDATE users SET
          name = COALESCE(${p.name ?? null}, name),
          role = COALESCE(${p.role ?? null}, role),
          is_active = COALESCE(${p.isActive ?? null}, is_active),
          password_hash = COALESCE(${passwordHash}, password_hash),
          updated_at = NOW()
        WHERE id = ${userId}::uuid AND tenant_id = ${user.tid}::uuid
        RETURNING id
      `;
      if (!updated[0]) return jsonResponse({ error: "not_found" }, 404);

      if (p.branchIds) {
        const branchesOk = await tx<{ c: string }[]>`
          SELECT COUNT(*)::text AS c FROM branches
          WHERE tenant_id = ${user.tid}::uuid
            AND id = ANY(${p.branchIds}::uuid[])
        `;
        if (Number(branchesOk[0]?.c ?? 0) !== p.branchIds.length) {
          return jsonResponse({ error: "invalid_branches" }, 400);
        }
        await tx`DELETE FROM user_branch_access WHERE user_id = ${userId}::uuid`;
        for (const branchId of p.branchIds) {
          await tx`
            INSERT INTO user_branch_access (id, user_id, branch_id, tenant_id)
            VALUES (gen_random_uuid(), ${userId}::uuid, ${branchId}::uuid, ${user.tid}::uuid)
          `;
        }
      }
      return jsonResponse({ ok: true });
    });
  } finally {
    await sql.end();
  }
}
