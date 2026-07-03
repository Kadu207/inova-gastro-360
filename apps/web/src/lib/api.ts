import { PORTS } from "@inova-gastro-360/config";

const LOCAL_API = `http://127.0.0.1:${PORTS.WRANGLER_API}`;
const LOCAL_RT = `http://127.0.0.1:${PORTS.WRANGLER_RT}`;

/** Em dev, ignora URL de produção acidental (Cloudflare Workers). */
function resolvePublicBase(configured: string | undefined, localDefault: string): string {
  if (process.env.NODE_ENV === "development") {
    if (!configured || configured.includes("inovatitech.com.br")) {
      return localDefault;
    }
  }
  return configured ?? localDefault;
}

export const API_BASE = resolvePublicBase(process.env.NEXT_PUBLIC_API_URL, LOCAL_API);
export const REALTIME_BASE = resolvePublicBase(process.env.NEXT_PUBLIC_REALTIME_URL, LOCAL_RT);

export function realtimeWsUrl(branchId: string): string {
  const base = REALTIME_BASE.replace(/^http/, "ws");
  const token = getToken();
  const tokenParam = token ? `&token=${encodeURIComponent(token)}` : "";
  return `${base}/ws?branchId=${branchId}${tokenParam}`;
}

export const DEMO_BRANCH_ID = "00000000-0000-4000-8000-000000000002";

/**
 * Filial ativa do usuário logado (definida no login a partir de user.branchIds).
 * Fallback: env pública ou branch demo (dev).
 */
export function getActiveBranchId(): string {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("activeBranchId");
    if (stored) return stored;
  }
  return process.env.NEXT_PUBLIC_DEFAULT_BRANCH_ID ?? DEMO_BRANCH_ID;
}

export function setActiveBranchId(branchId: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("activeBranchId", branchId);
}

export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("accessToken");
}

function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("refreshToken");
}

/** Persiste os tokens após login/refresh. */
export function storeSession(accessToken: string, refreshToken?: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("accessToken", accessToken);
  if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
}

/** Remove tokens da sessão local (logout). */
export function clearSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
}

async function tryRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { accessToken?: string; refreshToken?: string };
    if (!data.accessToken) return false;
    storeSession(data.accessToken, data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

/**
 * fetch autenticado com refresh transparente: em 401, tenta renovar a sessão
 * uma vez e repete a chamada; se falhar, faz logout.
 */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const withAuth = (token: string | null): RequestInit => {
    const headers = new Headers(init.headers);
    if (token) headers.set("authorization", `Bearer ${token}`);
    return { ...init, headers };
  };

  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  let res = await fetch(url, withAuth(getToken()));
  if (res.status !== 401) return res;

  const refreshed = await tryRefresh();
  if (!refreshed) {
    logout();
    return res;
  }
  res = await fetch(url, withAuth(getToken()));
  return res;
}

export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken();
  if (refreshToken) {
    try {
      await fetch(`${API_BASE}/api/v1/auth/logout`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      // logout local mesmo se a chamada falhar
    }
  }
  clearSession();
  if (typeof window !== "undefined") window.location.href = "/login";
}
