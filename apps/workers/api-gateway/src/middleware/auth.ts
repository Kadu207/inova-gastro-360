import { verifyAccessToken, type JwtPayload } from "@inova-gastro-360/auth";
import type { GatewayEnv } from "../types/env";

export async function requireAuth(
  request: Request,
  env: GatewayEnv,
): Promise<{ ok: true; user: JwtPayload } | { ok: false; response: Response }> {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return { ok: false, response: new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 }) };
  }
  const secret = env.JWT_SECRET ?? "dev-secret-change-in-production-32chars";
  const user = await verifyAccessToken(auth.slice(7), secret);
  if (!user) {
    return { ok: false, response: new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 }) };
  }
  return { ok: true, user };
}
