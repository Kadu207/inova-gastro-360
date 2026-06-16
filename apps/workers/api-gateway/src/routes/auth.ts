import {
  verifyPassword,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  accessTokenExpiresInSeconds,
  LoginInputSchema,
  hashPassword,
  type AuthUser,
} from "@inova-gastro-360/auth";
import { jsonResponse } from "../lib";
import { getSql } from "../lib/db";

import type { GatewayEnv } from "../types/env";

interface DbUserRow {
  id: string;
  tenant_id: string;
  email: string;
  name: string;
  role: string;
  password_hash: string;
  is_active: boolean;
}

async function parseJsonBody(request: Request): Promise<unknown | null> {
  try {
    const text = await request.text();
    if (!text.trim()) return null;
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

export async function handleLogin(request: Request, env: GatewayEnv): Promise<Response> {
  const raw = await parseJsonBody(request);
  if (raw === null) {
    return jsonResponse({ error: "invalid_json", message: "Corpo JSON inválido ou vazio" }, 400);
  }

  const body = LoginInputSchema.safeParse(raw);
  if (!body.success) {
    return jsonResponse({ error: "validation_error", details: body.error.flatten() }, 400);
  }

  const { email, password, tenantSlug } = body.data;
  const sql = getSql(env);

  try {
    let tenantId: string | undefined;

    if (tenantSlug) {
      const tenants = await sql<{ id: string }[]>`
        SELECT id FROM tenants WHERE slug = ${tenantSlug} AND status = 'active' LIMIT 1
      `;
      tenantId = tenants[0]?.id;
      if (!tenantId) return jsonResponse({ error: "tenant_not_found" }, 404);
    }

    const users = tenantId
      ? await sql<DbUserRow[]>`
          SELECT id, tenant_id, email, name, role, password_hash, is_active
          FROM users WHERE email = ${email} AND tenant_id = ${tenantId}::uuid LIMIT 1
        `
      : await sql<DbUserRow[]>`
          SELECT id, tenant_id, email, name, role, password_hash, is_active
          FROM users WHERE email = ${email} LIMIT 1
        `;

    const user = users[0];
    if (!user || !user.is_active) {
      return jsonResponse({ error: "invalid_credentials" }, 401);
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) return jsonResponse({ error: "invalid_credentials" }, 401);

    const branches = await sql<{ branch_id: string }[]>`
      SELECT branch_id FROM user_branch_access WHERE user_id = ${user.id}::uuid
    `;

    const branchIds = branches.map((b) => b.branch_id);
    const jwtSecret = env.JWT_SECRET ?? "dev-secret-change-in-production-32chars";

    const accessToken = await signAccessToken(
      {
        sub: user.id,
        tid: user.tenant_id,
        email: user.email,
        role: user.role,
        branches: branchIds,
      },
      jwtSecret,
    );

    const refreshToken = await signRefreshToken(user.id, jwtSecret);
    const refreshHash = await hashPassword(refreshToken);

    await sql`
      INSERT INTO sessions (id, user_id, refresh_token_hash, expires_at)
      VALUES (gen_random_uuid(), ${user.id}::uuid, ${refreshHash}, NOW() + INTERVAL '7 days')
    `;

    const authUser: AuthUser = {
      id: user.id,
      tenantId: user.tenant_id,
      email: user.email,
      name: user.name,
      role: user.role,
      branchIds,
    };

    return jsonResponse({
      user: authUser,
      accessToken,
      refreshToken,
      expiresIn: accessTokenExpiresInSeconds(),
    });
  } catch (err) {
    console.error("login_error", err);
    return jsonResponse({ error: "internal_error" }, 500);
  } finally {
    await sql.end();
  }
}

export async function handleMe(request: Request, env: GatewayEnv): Promise<Response> {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  const jwtSecret = env.JWT_SECRET ?? "dev-secret-change-in-production-32chars";
  const payload = await verifyAccessToken(auth.slice(7), jwtSecret);

  if (!payload) return jsonResponse({ error: "unauthorized" }, 401);

  return jsonResponse({
    user: {
      id: payload.sub,
      tenantId: payload.tid,
      email: payload.email,
      role: payload.role,
      branchIds: payload.branches,
    },
  });
}
