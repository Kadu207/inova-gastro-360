"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  createAdminTenant,
  fetchAdminTenants,
  patchAdminTenantStatus,
  type AdminTenant,
} from "@/lib/api";

export default function AdminTenantsPage() {
  const [tenants, setTenants] = useState<AdminTenant[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [phone, setPhone] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      setTenants(await fetchAdminTenants());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sem permissão (super_admin)");
      setTenants([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");
    try {
      await createAdminTenant({
        name,
        slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
        documentNumber: documentNumber.replace(/\D/g, "") || undefined,
        phone: phone || undefined,
        admin: { name: adminName, email: adminEmail, password: adminPassword },
      });
      setMessage("Tenant criado.");
      setName("");
      setSlug("");
      setAdminName("");
      setAdminEmail("");
      setAdminPassword("");
      setDocumentNumber("");
      setPhone("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao criar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="os-page" style={{ padding: "1rem", maxWidth: 960 }}>
      <h2>Tenants (plataforma)</h2>
      <p style={{ opacity: 0.8, marginBottom: "1rem" }}>Somente super_admin.</p>
      {message ? <p style={{ color: "var(--os-success, #16a34a)" }}>{message}</p> : null}
      {error ? <p style={{ color: "crimson" }}>{error}</p> : null}

      <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: "0.5rem", marginBottom: "1.5rem" }}>
        {tenants.map((t) => (
          <li
            key={t.id}
            style={{
              border: "1px solid var(--os-border, #333)",
              borderRadius: 8,
              padding: "0.75rem",
              display: "flex",
              flexWrap: "wrap",
              gap: "0.75rem",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <strong>{t.name}</strong> · <code>{t.slug}</code>
              <div style={{ fontSize: "0.85rem" }}>status: {t.status}</div>
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {t.status === "active" ? (
                <button
                  type="button"
                  className="os-btn"
                  disabled={busy}
                  onClick={() =>
                    void patchAdminTenantStatus(t.id, "suspended").then(load)
                  }
                >
                  Suspender
                </button>
              ) : (
                <button
                  type="button"
                  className="os-btn"
                  disabled={busy}
                  onClick={() => void patchAdminTenantStatus(t.id, "active").then(load)}
                >
                  Reativar
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      <form onSubmit={onCreate} style={{ display: "grid", gap: "0.75rem" }}>
        <h3>Novo tenant</h3>
        <input placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} required />
        <input placeholder="Slug" value={slug} onChange={(e) => setSlug(e.target.value)} required />
        <input
          placeholder="CNPJ/CPF (dígitos)"
          value={documentNumber}
          onChange={(e) => setDocumentNumber(e.target.value.replace(/\D/g, "").slice(0, 14))}
        />
        <input placeholder="Telefone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <input
          placeholder="Admin nome"
          value={adminName}
          onChange={(e) => setAdminName(e.target.value)}
          required
        />
        <input
          type="email"
          placeholder="Admin e-mail"
          value={adminEmail}
          onChange={(e) => setAdminEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Admin senha"
          value={adminPassword}
          onChange={(e) => setAdminPassword(e.target.value)}
          required
          minLength={8}
        />
        <button type="submit" className="os-btn" disabled={busy}>
          Criar tenant
        </button>
      </form>
    </div>
  );
}
