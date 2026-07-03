import { verifyAccessToken, type JwtPayload } from "@inova-gastro-360/auth";
import type { GatewayEnv } from "../types/env";
import { getJwtSecret } from "../lib/config";

export async function requireAuth(
  request: Request,
  env: GatewayEnv,
): Promise<{ ok: true; user: JwtPayload } | { ok: false; response: Response }> {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return { ok: false, response: new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 }) };
  }
  const secret = getJwtSecret(env);
  const user = await verifyAccessToken(auth.slice(7), secret);
  if (!user) {
    return { ok: false, response: new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 }) };
  }
  return { ok: true, user };
}

/** Verifica se o usuário possui um dos papéis exigidos. */
export function requireRole(
  user: JwtPayload,
  ...roles: string[]
): { ok: true } | { ok: false; response: Response } {
  if (roles.includes(user.role)) return { ok: true };
  return {
    ok: false,
    response: new Response(JSON.stringify({ error: "forbidden", message: "Permissão insuficiente" }), {
      status: 403,
      headers: { "content-type": "application/json" },
    }),
  };
}
