import { PORTS } from "@inova-gastro-360/config";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? `http://127.0.0.1:${PORTS.WRANGLER_API}`;
export const REALTIME_BASE = process.env.NEXT_PUBLIC_REALTIME_URL ?? `http://127.0.0.1:${PORTS.WRANGLER_RT}`;

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
