"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const SUBJECT_KEY = "lgpd-subject-id";
const CONSENT_KEY = "cookie-consent-v2";

type Prefs = { analytics: boolean; marketing: boolean };

function ensureSubjectId(): string {
  let id = localStorage.getItem(SUBJECT_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SUBJECT_KEY, id);
  }
  return id;
}

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>({ analytics: false, marketing: false });

  useEffect(() => {
    if (!localStorage.getItem(CONSENT_KEY)) setVisible(true);
  }, []);

  async function persist(next: Prefs) {
    const subjectId = ensureSubjectId();
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ ...next, essential: true, at: Date.now() }));
    try {
      await fetch("/api/v1/lgpd/consent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          subjectId,
          analytics: next.analytics,
          marketing: next.marketing,
        }),
      });
    } catch {
      // banner local ainda vale se API falhar
    }
    setVisible(false);
    setPrefsOpen(false);
  }

  if (!visible) return null;

  return (
    <div className="cookie-banner" role="dialog" aria-label="Consentimento de cookies">
      {!prefsOpen ? (
        <>
          <p>
            Usamos cookies essenciais para operar o Inova Gastro 360. Você pode aceitar todos ou
            escolher preferências. Veja a{" "}
            <Link href="/privacidade">política de privacidade</Link>.
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void persist({ analytics: true, marketing: true })}>
              Aceitar todos
            </button>
            <button type="button" onClick={() => setPrefsOpen(true)}>
              Preferências
            </button>
            <button type="button" onClick={() => void persist({ analytics: false, marketing: false })}>
              Só essenciais
            </button>
          </div>
        </>
      ) : (
        <>
          <p>Escolha categorias (essenciais sempre ativos):</p>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={prefs.analytics}
              onChange={(e) => setPrefs((p) => ({ ...p, analytics: e.target.checked }))}
            />
            Analytics
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={prefs.marketing}
              onChange={(e) => setPrefs((p) => ({ ...p, marketing: e.target.checked }))}
            />
            Marketing
          </label>
          <button type="button" onClick={() => void persist(prefs)}>
            Salvar preferências
          </button>
        </>
      )}
    </div>
  );
}
