"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ACCEPT_ALL_PREFERENCES,
  DEFAULT_CONSENT_PREFERENCES,
  LGPD_CONSENT_STORAGE_KEY,
  ensureSubjectId,
  parseStoredConsent,
  serializeConsent,
  submitConsent,
  type ConsentPreferences,
} from "@/lib/lgpd";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [prefs, setPrefs] = useState<ConsentPreferences>(DEFAULT_CONSENT_PREFERENCES);

  useEffect(() => {
    if (!parseStoredConsent(localStorage.getItem(LGPD_CONSENT_STORAGE_KEY))) setVisible(true);
  }, []);

  async function persist(next: ConsentPreferences) {
    const subjectId = ensureSubjectId(localStorage, () => crypto.randomUUID());
    localStorage.setItem(LGPD_CONSENT_STORAGE_KEY, serializeConsent(next));
    setVisible(false);
    setPrefsOpen(false);
    await submitConsent(subjectId, next);
  }

  if (!visible) return null;

  return (
    <div className="cookie-banner" role="dialog" aria-modal="true" aria-label="Consentimento de cookies">
      {!prefsOpen ? (
        <div className="cookie-banner-row">
          <p className="cookie-banner-text">
            Usamos cookies essenciais para operar o Inova Gastro 360. Você pode aceitar todos ou
            escolher suas preferências. Saiba mais na{" "}
            <Link href="/privacidade">política de privacidade</Link>.
          </p>
          <div className="cookie-banner-actions">
            <button type="button" className="cookie-btn cookie-btn-ghost" onClick={() => setPrefsOpen(true)}>
              Preferências
            </button>
            <button
              type="button"
              className="cookie-btn cookie-btn-outline"
              onClick={() => void persist(DEFAULT_CONSENT_PREFERENCES)}
            >
              Só essenciais
            </button>
            <button
              type="button"
              className="cookie-btn cookie-btn-primary"
              onClick={() => void persist(ACCEPT_ALL_PREFERENCES)}
            >
              Aceitar todos
            </button>
          </div>
        </div>
      ) : (
        <div className="cookie-prefs">
          <p className="cookie-banner-text">Escolha as categorias (essenciais sempre ativos):</p>
          <label className="cookie-pref-item">
            <input type="checkbox" checked disabled />
            Essenciais — necessários para o funcionamento do site
          </label>
          <label className="cookie-pref-item">
            <input
              type="checkbox"
              checked={prefs.analytics}
              onChange={(e) => setPrefs((p) => ({ ...p, analytics: e.target.checked }))}
            />
            Analytics — métricas de uso para melhorar o produto
          </label>
          <label className="cookie-pref-item">
            <input
              type="checkbox"
              checked={prefs.marketing}
              onChange={(e) => setPrefs((p) => ({ ...p, marketing: e.target.checked }))}
            />
            Marketing — comunicação e ofertas personalizadas
          </label>
          <div className="cookie-banner-actions">
            <button type="button" className="cookie-btn cookie-btn-ghost" onClick={() => setPrefsOpen(false)}>
              Voltar
            </button>
            <button type="button" className="cookie-btn cookie-btn-primary" onClick={() => void persist(prefs)}>
              Salvar preferências
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
