import type { JwtPayload } from "@inova-gastro-360/auth";
import { hashPassword } from "@inova-gastro-360/auth";
import { CreateTenantSchema } from "@inova-gastro-360/validation";
import { jsonResponse, parseJsonBody } from "../lib";
import { getSql } from "../lib/db";
import { requireRole } from "../middleware/auth";
import type { GatewayEnv } from "../types/env";

interface CreatedTenant {
  tenantId: string;
  companyId: string;
  branchId: string;
  adminUserId: string;
  subscriptionId: string;
}

/**
 * Provisiona um tenant completo (empresa + filial + usuário admin + assinatura trial)
 * em transação única. Restrito a super_admin.
 */
export async function handleCreateTenant(
  request: Request,
  env: GatewayEnv,
  user: JwtPayload,
): Promise<Response> {
  const roleCheck = requireRole(user, "super_admin");
  if (!roleCheck.ok) return roleCheck.response;

  const raw = await parseJsonBody(request);
  if (raw === null) return jsonResponse({ error: "invalid_json" }, 400);

  const parsed = CreateTenantSchema.safeParse(raw);
  if (!parsed.success) {
    return jsonResponse({ error: "validation_error", details: parsed.error.flatten() }, 400);
  }

  const { name, slug, tradeName, branchName, admin, planCode } = parsed.data;
  const passwordHash = await hashPassword(admin.password);
  const sql = getSql(env);

  try {
    const existing = await sql<{ id: string }[]>`
      SELECT id FROM tenants WHERE slug = ${slug} LIMIT 1
    `;
    if (existing[0]) return jsonResponse({ error: "slug_conflict" }, 409);

    const result = await sql.begin(async (tx) => {
      const [tenant] = await tx<{ id: string }[]>`
        INSERT INTO tenants (id, name, slug, status, updated_at)
        VALUES (gen_random_uuid(), ${name}, ${slug}, 'active', NOW())
        RETURNING id
      `;

      const [company] = await tx<{ id: string }[]>`
        INSERT INTO companies (id, tenant_id, trade_name, legal_name, updated_at)
        VALUES (gen_random_uuid(), ${tenant.id}::uuid, ${tradeName ?? name}, ${tradeName ?? name}, NOW())
        RETURNING id
      `;

      const [branch] = await tx<{ id: string }[]>`
        INSERT INTO branches (id, tenant_id, company_id, name, updated_at)
        VALUES (gen_random_uuid(), ${tenant.id}::uuid, ${company.id}::uuid, ${branchName}, NOW())
        RETURNING id
      `;

      const [adminUser] = await tx<{ id: string }[]>`
        INSERT INTO users (id, tenant_id, email, name, password_hash, role, updated_at)
        VALUES (gen_random_uuid(), ${tenant.id}::uuid, ${admin.email}, ${admin.name}, ${passwordHash}, 'admin_cliente', NOW())
        RETURNING id
      `;

      await tx`
        INSERT INTO user_branch_access (id, user_id, branch_id, tenant_id)
        VALUES (gen_random_uuid(), ${adminUser.id}::uuid, ${branch.id}::uuid, ${tenant.id}::uuid)
      `;

      const [plan] = await tx<{ id: string }[]>`
        SELECT id FROM subscription_plans WHERE code = ${planCode} AND is_active = true LIMIT 1
      `;

      const [subscription] = await tx<{ id: string }[]>`
        INSERT INTO subscriptions (id, tenant_id, plan_id, status, trial_ends_at, updated_at)
        VALUES (
          gen_random_uuid(), ${tenant.id}::uuid, ${plan?.id ?? null},
          'trialing', NOW() + INTERVAL '14 days', NOW()
        )
        RETURNING id
      `;

      return {
        tenantId: tenant.id,
        companyId: company.id,
        branchId: branch.id,
        adminUserId: adminUser.id,
        subscriptionId: subscription.id,
      } satisfies CreatedTenant;
    });

    return jsonResponse({ tenant: result }, 201);
  } catch (err) {
    const pgCode = (err as { code?: string }).code;
    if (pgCode === "23505") return jsonResponse({ error: "conflict" }, 409);
    console.error("create_tenant_error", err);
    return jsonResponse({ error: "internal_error" }, 500);
  } finally {
    await sql.end();
  }
}
