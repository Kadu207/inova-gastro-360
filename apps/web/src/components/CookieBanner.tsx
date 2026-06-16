"use client";

import { useEffect, useState } from "react";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("cookie-consent")) setVisible(true);
  }, []);

  function accept() {
    localStorage.setItem("cookie-consent", "accepted");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="cookie-banner" role="dialog" aria-label="Consentimento de cookies">
      <p>Usamos cookies essenciais para operar o Inova Gastro 360. Ao continuar, você concorda com nossa política de privacidade (LGPD).</p>
      <button type="button" onClick={accept}>
        Aceitar
      </button>
    </div>
  );
}
