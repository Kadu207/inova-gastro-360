"use client";

import { useState } from "react";
import { APP_NAME } from "@inova-gastro-360/config";
import { API_BASE } from "@/lib/api";
import { loginErrorMessage } from "@/lib/login-errors";

export default function LoginPage() {
  const [email, setEmail] = useState("admin@inovagastro360.local");
  const [password, setPassword] = useState("");
  const [tenantSlug, setTenantSlug] = useState("demo-burger");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password, tenantSlug }),
      });
      const data = (await res.json()) as { error?: string; accessToken?: string };
      if (!res.ok) {
        setError(loginErrorMessage(data.error, API_BASE));
        return;
      }
      if (!data.accessToken) {
        setError("Resposta inválida da API.");
        return;
      }
      localStorage.setItem("accessToken", data.accessToken);
      window.location.href = "/dashboard";
    } catch {
      setError(`API indisponível em ${API_BASE}. Inicie: npm run dev:api`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app-shell">
      <form className="login-card" onSubmit={handleSubmit}>
        <p className="eyebrow">Acesso</p>
        <h1>{APP_NAME}</h1>
        <label>
          E-mail
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Senha
          <span className="password-field">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="current-password"
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              aria-pressed={showPassword}
            >
              {showPassword ? "Ocultar" : "Mostrar"}
            </button>
          </span>
        </label>
        <label>
          Tenant (slug)
          <input value={tenantSlug} onChange={(e) => setTenantSlug(e.target.value)} />
        </label>
        {process.env.NODE_ENV === "development" && (
          <p className="hint">API de login: {API_BASE}</p>
        )}
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
