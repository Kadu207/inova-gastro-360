import { describe, it, expect } from "vitest";
import {
  ensureSubjectId,
  serializeConsent,
  parseStoredConsent,
  buildConsentPayload,
  DEFAULT_CONSENT_PREFERENCES,
  ACCEPT_ALL_PREFERENCES,
  LGPD_SUBJECT_STORAGE_KEY,
} from "./lgpd";

function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  } as Storage;
}

describe("lgpd — subjectId", () => {
  it("gera e persiste um novo subjectId quando não existe", () => {
    const storage = createMemoryStorage();
    const id = ensureSubjectId(storage, () => "generated-id");
    expect(id).toBe("generated-id");
    expect(storage.getItem(LGPD_SUBJECT_STORAGE_KEY)).toBe("generated-id");
  });

  it("reaproveita subjectId já existente sem gerar outro", () => {
    const storage = createMemoryStorage();
    storage.setItem(LGPD_SUBJECT_STORAGE_KEY, "existing-id");
    const id = ensureSubjectId(storage, () => "should-not-be-used");
    expect(id).toBe("existing-id");
  });
});

describe("lgpd — preferências de consentimento", () => {
  it("serializa preferências sempre com essential=true", () => {
    const raw = serializeConsent(DEFAULT_CONSENT_PREFERENCES, 1000);
    const parsed = JSON.parse(raw);
    expect(parsed).toEqual({ essential: true, analytics: false, marketing: false, at: 1000 });
  });

  it("aceitar todos marca analytics e marketing como true", () => {
    expect(ACCEPT_ALL_PREFERENCES).toEqual({ analytics: true, marketing: true });
  });

  it("parseStoredConsent lê valor válido", () => {
    const raw = serializeConsent({ analytics: true, marketing: false }, 500);
    const parsed = parseStoredConsent(raw);
    expect(parsed).toEqual({ essential: true, analytics: true, marketing: false, at: 500 });
  });

  it("parseStoredConsent retorna null para JSON inválido", () => {
    expect(parseStoredConsent("{not-json")).toBeNull();
    expect(parseStoredConsent(null)).toBeNull();
  });

  it("buildConsentPayload monta corpo esperado pela API", () => {
    const payload = buildConsentPayload("subj-1", "branch-1", { analytics: true, marketing: true });
    expect(payload).toEqual({
      subjectId: "subj-1",
      branchId: "branch-1",
      analytics: true,
      marketing: true,
    });
  });
});
