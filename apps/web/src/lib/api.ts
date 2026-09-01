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

let accessTokenMemory: string | null = null;
let userRoleMemory: string | null = null;

export function realtimeWsUrl(branchId: string): string {
  const base = REALTIME_BASE.replace(/^http/, "ws");
  return `${base}/ws?branchId=${encodeURIComponent(branchId)}`;
}

/** Protocolos WS com JWT (nunca na query string). */
export function realtimeWsProtocols(): string[] | undefined {
  const token = getToken();
  if (!token) return undefined;
  return ["inova.jwt", token];
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
  return accessTokenMemory;
}

function roleFromAccessToken(accessToken: string): string | null {
  try {
    const payload = accessToken.split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const base64 = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const decoded = JSON.parse(atob(base64)) as { role?: unknown };
    return typeof decoded.role === "string" ? decoded.role : null;
  } catch {
    return null;
  }
}

export function getSessionRole(): string | null {
  return userRoleMemory;
}

/** Mantém o access token e o papel somente na memória desta aba. */
export function storeSession(accessToken: string, userRole?: string): void {
  accessTokenMemory = accessToken;
  userRoleMemory = userRole ?? roleFromAccessToken(accessToken);
}

/** Remove a sessão mantida em memória; refresh permanece apenas em cookie HttpOnly. */
export function clearSession(): void {
  accessTokenMemory = null;
  userRoleMemory = null;
}

async function tryRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: "{}",
    });
    if (!res.ok) return false;
    const data = (await res.json()) as {
      accessToken?: string;
      user?: { role?: string };
    };
    if (!data.accessToken) return false;
    storeSession(data.accessToken, data.user?.role);
    return true;
  } catch {
    return false;
  }
}

/** Restaura a sessão em memória a partir do refresh cookie HttpOnly. */
export async function ensureSession(): Promise<boolean> {
  if (getToken()) return true;
  return tryRefresh();
}

/**
 * fetch autenticado com refresh transparente: em 401, tenta renovar a sessão
 * uma vez e repete a chamada; se falhar, faz logout.
 */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const withAuth = (token: string | null): RequestInit => {
    const headers = new Headers(init.headers);
    if (token) headers.set("authorization", `Bearer ${token}`);
    return { ...init, headers, credentials: "include" };
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
  try {
    await fetch(`${API_BASE}/api/v1/auth/logout`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: "{}",
    });
  } catch {
    // logout local mesmo se a chamada falhar
  }
  clearSession();
  if (typeof window !== "undefined") window.location.href = "/login";
}

export interface OrderPaymentResponse {
  paymentIntentId: string;
  method: string;
  status: string;
  amountCents: number;
  expiresAt: string | null;
  pix?: { qrCodeBase64: string | null; copyPaste: string | null };
  card?: { redirectUrl: string };
}

export async function createOrderPayment(
  branchId: string,
  orderId: string,
  method: "pix" | "card",
  customerPhone?: string,
): Promise<OrderPaymentResponse> {
  const path = `/api/v1/branches/${branchId}/orders/${orderId}/pay`;
  const init: RequestInit = {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ method, customerPhone }),
  };
  const res = getToken()
    ? await apiFetch(path, init)
    : await fetch(`${API_BASE}${path}`, { ...init, credentials: "include" });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? data.error ?? "payment_failed");
  return data as OrderPaymentResponse;
}

export async function getOrderPaymentStatus(
  branchId: string,
  orderId: string,
  customerPhone?: string,
): Promise<{ paymentStatus: string; paidAt: string | null; expiresAt: string | null }> {
  const path = `/api/v1/branches/${branchId}/orders/${orderId}/payment`;
  const headers: Record<string, string> = {};
  if (customerPhone) headers["x-guest-phone"] = customerPhone;
  const init: RequestInit = { headers };
  const res = getToken()
    ? await apiFetch(path, init)
    : await fetch(`${API_BASE}${path}`, { ...init, credentials: "include" });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "payment_status_failed");
  return data;
}

export interface BillingSubscription {
  status: string;
  plan: { code: string; name: string; priceCents: number } | null;
  trialEndsAt: string | null;
  gracePeriodEndsAt: string | null;
}

export async function fetchBillingSubscription(): Promise<BillingSubscription> {
  const res = await apiFetch("/api/v1/billing/subscription");
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "subscription_fetch_failed");
  return data;
}

export async function fetchBillingPlans(): Promise<
  { code: string; name: string; price_cents: number; max_branches: number }[]
> {
  const res = await fetch(`${API_BASE}/api/v1/billing/plans`);
  const data = await res.json();
  return data.plans ?? [];
}

export interface PaymentsStatus {
  enabled: boolean;
  mercadoPago: boolean;
  stripe: boolean;
  deliveryOnlinePayment: boolean;
  saasBilling: boolean;
  message?: string;
}

export async function fetchPaymentsStatus(): Promise<PaymentsStatus> {
  const res = await fetch(`${API_BASE}/api/v1/payments/status`);
  const data = await res.json();
  return data as PaymentsStatus;
}

export interface CashSession {
  id: string;
  status: string;
  openingCents: number;
  openedAt: string;
  ledgerTotalCents: number;
}

export interface FinanceAccount {
  id: string;
  description: string;
  amount_cents: number;
  due_date: string;
  status: string;
  paid_at: string | null;
}

export interface FinanceDre {
  from: string;
  to: string;
  revenueCents: number;
  expensesCents: number;
  resultCents: number;
}

async function financeJson<T>(res: Response, fallbackError: string): Promise<T> {
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? data.error ?? fallbackError);
  return data as T;
}

export async function fetchCurrentCashSession(branchId: string): Promise<CashSession | null> {
  const res = await apiFetch(`/api/v1/finance/cash/branch/${branchId}`);
  const data = await financeJson<{ session: CashSession | null }>(res, "cash_session_fetch_failed");
  return data.session;
}

export async function openCashSession(
  branchId: string,
  openingCents: number,
): Promise<{ sessionId: string; status: string; openedAt: string }> {
  const res = await apiFetch("/api/v1/finance/cash/open", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ branchId, openingCents }),
  });
  return financeJson(res, "cash_open_failed");
}

export async function closeCashSession(sessionId: string, closingCents: number): Promise<void> {
  const res = await apiFetch(`/api/v1/finance/cash/${sessionId}/close`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ closingCents }),
  });
  await financeJson(res, "cash_close_failed");
}

export async function cashMovement(
  sessionId: string,
  kind: "sangria" | "suprimento",
  amountCents: number,
  description: string,
): Promise<void> {
  const res = await apiFetch(`/api/v1/finance/cash/${sessionId}/${kind}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ amountCents, description }),
  });
  await financeJson(res, "cash_movement_failed");
}

export async function fetchPayables(): Promise<FinanceAccount[]> {
  const res = await apiFetch("/api/v1/finance/payables");
  const data = await financeJson<{ payables: FinanceAccount[] }>(res, "payables_fetch_failed");
  return data.payables;
}

export async function createPayable(input: {
  branchId: string;
  description: string;
  amountCents: number;
  dueDate: string;
  supplier?: string;
}): Promise<void> {
  const res = await apiFetch("/api/v1/finance/payables", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  await financeJson(res, "payable_create_failed");
}

export async function payPayable(id: string): Promise<void> {
  const res = await apiFetch(`/api/v1/finance/payables/${id}/pay`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  });
  await financeJson(res, "payable_pay_failed");
}

export async function fetchReceivables(): Promise<FinanceAccount[]> {
  const res = await apiFetch("/api/v1/finance/receivables");
  const data = await financeJson<{ receivables: FinanceAccount[] }>(res, "receivables_fetch_failed");
  return data.receivables;
}

export async function createReceivable(input: {
  branchId: string;
  description: string;
  amountCents: number;
  dueDate: string;
  customer?: string;
}): Promise<void> {
  const res = await apiFetch("/api/v1/finance/receivables", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  await financeJson(res, "receivable_create_failed");
}

export async function receiveReceivable(id: string): Promise<void> {
  const res = await apiFetch(`/api/v1/finance/receivables/${id}/receive`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  });
  await financeJson(res, "receivable_receive_failed");
}

export async function fetchFinanceDre(): Promise<FinanceDre> {
  const res = await apiFetch("/api/v1/finance/dre");
  return financeJson(res, "dre_fetch_failed");
}

/** Baixa o CSV do ledger financeiro autenticado (rota exige Bearer token). */
export async function downloadFinanceExportCsv(): Promise<void> {
  const res = await apiFetch("/api/v1/finance/export?format=csv");
  if (!res.ok) throw new Error("export_failed");
  const blob = await res.blob();
  if (typeof window === "undefined") return;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "financeiro.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function startBillingCheckout(planCode: string): Promise<string> {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const res = await apiFetch("/api/v1/billing/checkout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      planCode,
      successUrl: `${origin}/dashboard/billing?success=1`,
      cancelUrl: `${origin}/dashboard/billing?cancel=1`,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "checkout_failed");
  return data.checkoutUrl as string;
}

export type SettingsCompany = {
  id: string;
  tradeName: string;
  legalName: string | null;
  documentNumber: string | null;
  phone: string | null;
};

export type SettingsBranch = {
  id: string;
  name: string;
  address: string | null;
  timezone: string;
  isActive: boolean;
};

export type SettingsUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  branchIds: string[];
};

export async function fetchSettingsCompany(): Promise<SettingsCompany> {
  const res = await apiFetch("/api/v1/settings/company");
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "company_failed");
  return data.company as SettingsCompany;
}

export async function patchSettingsCompany(input: Partial<SettingsCompany>): Promise<void> {
  const res = await apiFetch("/api/v1/settings/company", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? "company_patch_failed");
  }
}

export async function fetchSettingsBranches(): Promise<SettingsBranch[]> {
  const res = await apiFetch("/api/v1/settings/branches");
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "branches_failed");
  return (data.branches ?? []) as SettingsBranch[];
}

export async function createSettingsBranch(input: {
  name: string;
  address?: string;
}): Promise<void> {
  const res = await apiFetch("/api/v1/settings/branches", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? "branch_create_failed");
  }
}

export async function patchSettingsBranch(
  id: string,
  input: { name?: string; address?: string | null; isActive?: boolean },
): Promise<void> {
  const res = await apiFetch(`/api/v1/settings/branches/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? "branch_patch_failed");
  }
}

export async function fetchSettingsUsers(): Promise<SettingsUser[]> {
  const res = await apiFetch("/api/v1/settings/users");
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "users_failed");
  return (data.users ?? []) as SettingsUser[];
}

export async function createSettingsUser(input: {
  name: string;
  email: string;
  password: string;
  role: string;
  branchIds: string[];
}): Promise<void> {
  const res = await apiFetch("/api/v1/settings/users", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? "user_create_failed");
  }
}

export async function patchSettingsUser(
  id: string,
  input: { name?: string; role?: string; isActive?: boolean; branchIds?: string[]; password?: string },
): Promise<void> {
  const res = await apiFetch(`/api/v1/settings/users/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? "user_patch_failed");
  }
}

export type AdminTenant = {
  id: string;
  name: string;
  slug: string;
  status: string;
  createdAt: string;
};

export async function fetchAdminTenants(): Promise<AdminTenant[]> {
  const res = await apiFetch("/api/v1/admin/tenants");
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "tenants_failed");
  return (data.tenants ?? []) as AdminTenant[];
}

export async function patchAdminTenantStatus(id: string, status: string): Promise<void> {
  const res = await apiFetch(`/api/v1/admin/tenants/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? "tenant_patch_failed");
  }
}

export async function createAdminTenant(input: Record<string, unknown>): Promise<void> {
  const res = await apiFetch("/api/v1/admin/tenants", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? "tenant_create_failed");
  }
}
