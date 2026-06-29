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
  return `${base}/ws?branchId=${branchId}`;
}

export const DEMO_BRANCH_ID = "00000000-0000-4000-8000-000000000002";

export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("accessToken");
}

/** Remove tokens da sessão local (logout). */
export function clearSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
}

export function logout(): void {
  clearSession();
  window.location.href = "/login";
}
