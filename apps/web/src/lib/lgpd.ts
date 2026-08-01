import { apiFetch, getActiveBranchId } from "./api";

export const LGPD_SUBJECT_STORAGE_KEY = "lgpd-subject-id";
export const LGPD_CONSENT_STORAGE_KEY = "cookie-consent-v2";

export interface ConsentPreferences {
  analytics: boolean;
  marketing: boolean;
}

export interface StoredConsent extends ConsentPreferences {
  essential: true;
  at: number;
}

export const DEFAULT_CONSENT_PREFERENCES: ConsentPreferences = { analytics: false, marketing: false };
export const ACCEPT_ALL_PREFERENCES: ConsentPreferences = { analytics: true, marketing: true };

type StorageLike = Pick<Storage, "getItem" | "setItem">;

/** Retorna (ou cria) o identificador anônimo do titular usado para correlacionar consentimentos. */
export function ensureSubjectId(storage: StorageLike, generateId: () => string): string {
  const existing = storage.getItem(LGPD_SUBJECT_STORAGE_KEY);
  if (existing) return existing;
  const id = generateId();
  storage.setItem(LGPD_SUBJECT_STORAGE_KEY, id);
  return id;
}

/** Serializa preferências para persistência local — essencial é sempre true. */
export function serializeConsent(prefs: ConsentPreferences, now: number = Date.now()): string {
  const stored: StoredConsent = { essential: true, analytics: prefs.analytics, marketing: prefs.marketing, at: now };
  return JSON.stringify(stored);
}

/** Faz o parse defensivo do valor persistido — nunca lança, mesmo com JSON corrompido. */
export function parseStoredConsent(raw: string | null): StoredConsent | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredConsent>;
    return {
      essential: true,
      analytics: Boolean(parsed.analytics),
      marketing: Boolean(parsed.marketing),
      at: typeof parsed.at === "number" ? parsed.at : Date.now(),
    };
  } catch {
    return null;
  }
}

export function buildConsentPayload(subjectId: string, branchId: string, prefs: ConsentPreferences) {
  return {
    subjectId,
    branchId,
    analytics: prefs.analytics,
    marketing: prefs.marketing,
  };
}

/** Envia o consentimento à API — best-effort, o banner segue funcionando mesmo se a chamada falhar. */
export async function submitConsent(subjectId: string, prefs: ConsentPreferences): Promise<void> {
  try {
    await apiFetch("/api/v1/lgpd/consent", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(buildConsentPayload(subjectId, getActiveBranchId(), prefs)),
    });
  } catch {
    // preferências locais já persistidas; reenvio poderá ocorrer em visita futura
  }
}

export interface ErasureRequestSummary {
  id: string;
  subject_id: string;
  subject_type: string;
  status: string;
  reason: string | null;
  created_at: string;
  resolved_at: string | null;
}

export async function fetchErasureRequests(): Promise<ErasureRequestSummary[]> {
  const res = await apiFetch("/api/v1/lgpd/erasure-requests");
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "erasure_list_failed");
  return data.requests ?? [];
}

export async function createErasureRequest(
  subjectId: string,
  subjectType: "user" | "customer",
  reason?: string,
): Promise<ErasureRequestSummary> {
  const res = await apiFetch("/api/v1/lgpd/erasure-requests", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ subjectId, subjectType, reason }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "erasure_create_failed");
  return data;
}

export async function updateErasureRequestStatus(
  id: string,
  status: "pending" | "in_progress" | "completed" | "rejected",
): Promise<void> {
  const res = await apiFetch(`/api/v1/lgpd/erasure-requests/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error ?? "erasure_update_failed");
  }
}

export async function fetchTitularExport(): Promise<unknown> {
  const res = await apiFetch("/api/v1/lgpd/export");
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "export_failed");
  return data;
}
