"use client";

import { useState } from "react";
import { APP_NAME, PORTS } from "@inova-gastro-360/config";

export default function LoginPage() {
  const [email, setEmail] = useState("admin@inovagastro360.local");
  const [password, setPassword] = useState("");
  const [tenantSlug, setTenantSlug] = useState("demo-burger");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? `http://127.0.0.1:${PORTS.WRANGLER_API}`;

    try {
      const res = await fetch(`${apiUrl}/api/v1/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password, tenantSlug }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Falha no login");
        return;
      }
      localStorage.setItem("accessToken", data.accessToken);
      window.location.href = "/dashboard";
    } catch {
      setError("API indisponível. Inicie o api-gateway (wrangler dev).");
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
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </label>
        <label>
          Tenant (slug)
          <input value={tenantSlug} onChange={(e) => setTenantSlug(e.target.value)} />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
