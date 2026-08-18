import type { JwtPayload } from "./types";

/** Cookie HttpOnly do access token (API + WebSocket same-site). */
export const ACCESS_COOKIE_NAME = "ig360_access";
/** Cookie HttpOnly do refresh token. */
export const REFRESH_COOKIE_NAME = "ig360_refresh";
/** Primeiro valor de Sec-WebSocket-Protocol — o seguinte carrega o JWT. */
export const WS_PROTOCOL_MARKER = "inova.jwt";

/** Papéis que podem mutar status de pedido / filas operacionais. */
export const ORDER_OPS_ROLES = [
  "super_admin",
  "admin_cliente",
  "gestor_filial",
  "atendente",
  "caixa",
  "cozinha",
  "entregador",
] as const;

export function parseCookieHeader(cookieHeader: string | null | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  for (const part of cookieHeader.split(";")) {
    const idx = part.indexOf("=");
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (!key) continue;
    try {
      out[key] = decodeURIComponent(value);
    } catch {
      out[key] = value;
    }
  }
  return out;
}

/**
 * Extrai access token sem usar query string.
 * Ordem: Authorization Bearer → cookie → Sec-WebSocket-Protocol (marker + jwt).
 */
export function extractAccessToken(headers: Headers): string | null {
  const auth = headers.get("authorization");
  if (auth?.startsWith("Bearer ") && auth.length > 7) {
    return auth.slice(7).trim() || null;
  }

  const cookies = parseCookieHeader(headers.get("cookie"));
  const fromCookie = cookies[ACCESS_COOKIE_NAME]?.trim();
  if (fromCookie) return fromCookie;

  const proto = headers.get("sec-websocket-protocol");
  if (proto) {
    const parts = proto.split(",").map((p) => p.trim()).filter(Boolean);
    const markerIdx = parts.findIndex((p) => p === WS_PROTOCOL_MARKER);
    if (markerIdx >= 0 && parts[markerIdx + 1]) {
      return parts[markerIdx + 1];
    }
  }

  return null;
}

/**
 * Escopo de filial no JWT.
 * `branches` vazio = acesso a todas as filiais do tenant (admins sem mapping).
 */
export function canAccessBranch(user: Pick<JwtPayload, "branches">, branchId: string): boolean {
  if (!branchId || branchId === "default") return false;
  if (user.branches.length === 0) return true;
  return user.branches.includes(branchId);
}

export function hasOrderOpsRole(role: string): boolean {
  return (ORDER_OPS_ROLES as readonly string[]).includes(role);
}

/** Protocolos WebSocket para o browser (sem colocar JWT na URL). */
export function buildWsProtocols(accessToken: string): string[] {
  return [WS_PROTOCOL_MARKER, accessToken];
}
