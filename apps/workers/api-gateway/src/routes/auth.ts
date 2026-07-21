import {
  verifyPassword,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  accessTokenExpiresInSeconds,
  LoginInputSchema,
  hashPassword,
  type AuthUser,
} from "@inova-gastro-360/auth";
import { jsonResponse, parseJsonBody, clientIp } from "../lib";
import { getSql, withTenant } from "../lib/db";
import { getJwtSecret } from "../lib/config";
import { hitRateLimitAsync, clearRateLimitAsync } from "../lib/rate-limit";

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

async function issueSession(
  sql: ReturnType<typeof getSql>,
  user: DbUserRow,
  jwtSecret: string,
): Promise<{ user: AuthUser; accessToken: string; refreshToken: string; expiresIn: number }> {
  const branches = await sql<{ branch_id: string }[]>`
    SELECT branch_id FROM user_branch_access WHERE user_id = ${user.id}::uuid
  `;
  const branchIds = branches.map((b) => b.branch_id);

  const accessToken = await signAccessToken(
    { sub: user.id, tid: user.tenant_id, email: user.email, role: user.role, branches: branchIds },
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

  return { user: authUser, accessToken, refreshToken, expiresIn: accessTokenExpiresInSeconds() };
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

  const rlKey = `login:${clientIp(request)}:${email.toLowerCase()}`;
  const rl = await hitRateLimitAsync(rlKey);
  if (!rl.allowed) {
    return new Response(
      JSON.stringify({ error: "too_many_attempts", message: "Muitas tentativas. Tente mais tarde." }),
      {
        status: 429,
        headers: {
          "content-type": "application/json; charset=utf-8",
          "retry-after": String(rl.retryAfterSeconds),
        },
      },
    );
  }

  const jwtSecret = getJwtSecret(env);
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
          FROM app_find_users_for_login(${email}, ${tenantId}::uuid)
        `
      : await sql<DbUserRow[]>`
          SELECT id, tenant_id, email, name, role, password_hash, is_active
          FROM app_find_users_for_login(${email}, NULL)
        `;

    if (!tenantId && users.length > 1) {
      return jsonResponse(
        { error: "tenant_required", message: "Informe o tenant (slug) para este e-mail." },
        400,
      );
    }

    const user = users[0];
    if (!user || !user.is_active) {
      return jsonResponse({ error: "invalid_credentials" }, 401);
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) return jsonResponse({ error: "invalid_credentials" }, 401);

    await clearRateLimitAsync(rlKey);
    const session = await withTenant(sql, user.tenant_id, (tx) => issueSession(tx, user, jwtSecret));
    return jsonResponse(session);
  } catch (err) {
    console.error("login_error", err);
    return jsonResponse({ error: "internal_error" }, 500);
  } finally {
    await sql.end();
  }
}

export async function handleRefresh(request: Request, env: GatewayEnv): Promise<Response> {
  const raw = await parseJsonBody(request);
  const token = (raw as { refreshToken?: string } | null)?.refreshToken;
  if (!token) return jsonResponse({ error: "invalid_request", message: "refreshToken obrigatório" }, 400);

  const jwtSecret = getJwtSecret(env);
  const decoded = await verifyRefreshToken(token, jwtSecret);
  if (!decoded) return jsonResponse({ error: "unauthorized" }, 401);

  const sql = getSql(env);
  try {
    const users = await sql<DbUserRow[]>`
      SELECT id, tenant_id, email, name, role, password_hash, is_active
      FROM app_find_active_user_by_id(${decoded.sub}::uuid)
    `;
    const user = users[0];
    if (!user) return jsonResponse({ error: "unauthorized" }, 401);

    return await withTenant(sql, user.tenant_id, async (tx) => {
      const sessions = await tx<{ id: string; refresh_token_hash: string }[]>`
        SELECT id, refresh_token_hash FROM sessions
        WHERE user_id = ${decoded.sub}::uuid AND expires_at > NOW()
        ORDER BY created_at DESC
      `;

      let matched: string | undefined;
      for (const s of sessions) {
        if (await verifyPassword(token, s.refresh_token_hash)) {
          matched = s.id;
          break;
        }
      }
      if (!matched) return jsonResponse({ error: "unauthorized" }, 401);

      await tx`DELETE FROM sessions WHERE id = ${matched}::uuid`;
      const session = await issueSession(tx, user, jwtSecret);
      return jsonResponse(session);
    });
  } catch (err) {
    console.error("refresh_error", err);
    return jsonResponse({ error: "internal_error" }, 500);
  } finally {
    await sql.end();
  }
}

export async function handleLogout(request: Request, env: GatewayEnv): Promise<Response> {
  const raw = await parseJsonBody(request);
  const token = (raw as { refreshToken?: string } | null)?.refreshToken;
  if (!token) return jsonResponse({ ok: true });

  const jwtSecret = getJwtSecret(env);
  const decoded = await verifyRefreshToken(token, jwtSecret);
  if (!decoded) return jsonResponse({ ok: true });

  const sql = getSql(env);
  try {
    const users = await sql<{ tenant_id: string }[]>`
      SELECT tenant_id FROM app_find_active_user_by_id(${decoded.sub}::uuid)
    `;
    const tenantId = users[0]?.tenant_id;
    if (!tenantId) return jsonResponse({ ok: true });

    await withTenant(sql, tenantId, async (tx) => {
      const sessions = await tx<{ id: string; refresh_token_hash: string }[]>`
        SELECT id, refresh_token_hash FROM sessions WHERE user_id = ${decoded.sub}::uuid
      `;
      for (const s of sessions) {
        if (await verifyPassword(token, s.refresh_token_hash)) {
          await tx`DELETE FROM sessions WHERE id = ${s.id}::uuid`;
          break;
        }
      }
    });
    return jsonResponse({ ok: true });
  } finally {
    await sql.end();
  }
}

export async function handleMe(request: Request, env: GatewayEnv): Promise<Response> {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  const jwtSecret = getJwtSecret(env);
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
