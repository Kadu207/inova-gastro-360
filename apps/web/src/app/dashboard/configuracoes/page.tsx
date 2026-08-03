"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  createSettingsBranch,
  createSettingsUser,
  fetchSettingsBranches,
  fetchSettingsCompany,
  fetchSettingsUsers,
  patchSettingsBranch,
  patchSettingsCompany,
  patchSettingsUser,
  type SettingsBranch,
  type SettingsCompany,
  type SettingsUser,
} from "@/lib/api";

type Tab = "loja" | "filiais" | "usuarios";

export default function ConfiguracoesPage() {
  const [tab, setTab] = useState<Tab>("loja");
  const [company, setCompany] = useState<SettingsCompany | null>(null);
  const [branches, setBranches] = useState<SettingsBranch[]>([]);
  const [users, setUsers] = useState<SettingsUser[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [tradeName, setTradeName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [phone, setPhone] = useState("");

  const [newBranchName, setNewBranchName] = useState("");
  const [newBranchAddress, setNewBranchAddress] = useState("");

  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [userRole, setUserRole] = useState("atendente");
  const [userBranchId, setUserBranchId] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const [c, b, u] = await Promise.all([
        fetchSettingsCompany(),
        fetchSettingsBranches(),
        fetchSettingsUsers(),
      ]);
      setCompany(c);
      setTradeName(c.tradeName);
      setLegalName(c.legalName ?? "");
      setDocumentNumber(c.documentNumber ?? "");
      setPhone(c.phone ?? "");
      setBranches(b);
      setUsers(u);
      if (!userBranchId && b[0]) setUserBranchId(b[0].id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar");
    }
  }, [userBranchId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveCompany(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");
    try {
      await patchSettingsCompany({
        tradeName,
        legalName: legalName || undefined,
        documentNumber: documentNumber.replace(/\D/g, "") || undefined,
        phone: phone || null,
      });
      setMessage("Loja atualizada.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar");
    } finally {
      setBusy(false);
    }
  }

  async function addBranch(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await createSettingsBranch({
        name: newBranchName,
        address: newBranchAddress || undefined,
      });
      setNewBranchName("");
      setNewBranchAddress("");
      setMessage("Filial criada.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao criar filial");
    } finally {
      setBusy(false);
    }
  }

  async function addUser(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await createSettingsUser({
        name: userName,
        email: userEmail,
        password: userPassword,
        role: userRole,
        branchIds: [userBranchId],
      });
      setUserName("");
      setUserEmail("");
      setUserPassword("");
      setMessage("Usuário criado.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao criar usuário");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="os-page" style={{ padding: "1rem", maxWidth: 960 }}>
      <h2 style={{ marginBottom: "0.75rem" }}>Configurações</h2>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        {(
          [
            ["loja", "Loja"],
            ["filiais", "Filiais"],
            ["usuarios", "Usuários"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className="os-btn"
            onClick={() => setTab(id)}
            style={{ opacity: tab === id ? 1 : 0.6 }}
          >
            {label}
          </button>
        ))}
      </div>
      {message ? <p style={{ color: "var(--os-success, #16a34a)" }}>{message}</p> : null}
      {error ? <p style={{ color: "crimson" }}>{error}</p> : null}

      {tab === "loja" && company ? (
        <form onSubmit={saveCompany} className="os-form" style={{ display: "grid", gap: "0.75rem" }}>
          <label>
            Nome fantasia
            <input value={tradeName} onChange={(e) => setTradeName(e.target.value)} required />
          </label>
          <label>
            Razão social
            <input value={legalName} onChange={(e) => setLegalName(e.target.value)} />
          </label>
          <label>
            CNPJ/CPF (só dígitos)
            <input
              value={documentNumber}
              onChange={(e) => setDocumentNumber(e.target.value.replace(/\D/g, "").slice(0, 14))}
              inputMode="numeric"
            />
          </label>
          <label>
            Telefone
            <input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>
          <button type="submit" className="os-btn" disabled={busy}>
            Salvar loja
          </button>
        </form>
      ) : null}

      {tab === "filiais" ? (
        <div style={{ display: "grid", gap: "1.25rem" }}>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "0.5rem" }}>
            {branches.map((b) => (
              <li
                key={b.id}
                style={{
                  border: "1px solid var(--os-border, #333)",
                  padding: "0.75rem",
                  borderRadius: 8,
                }}
              >
                <strong>{b.name}</strong>
                <div style={{ fontSize: "0.9rem", opacity: 0.85 }}>{b.address || "Sem endereço"}</div>
                <button
                  type="button"
                  className="os-btn"
                  style={{ marginTop: "0.5rem" }}
                  disabled={busy}
                  onClick={() =>
                    void patchSettingsBranch(b.id, { isActive: !b.isActive }).then(load)
                  }
                >
                  {b.isActive ? "Desativar" : "Ativar"}
                </button>
              </li>
            ))}
          </ul>
          <form onSubmit={addBranch} style={{ display: "grid", gap: "0.75rem" }}>
            <h3>Nova filial</h3>
            <input
              placeholder="Nome"
              value={newBranchName}
              onChange={(e) => setNewBranchName(e.target.value)}
              required
            />
            <input
              placeholder="Endereço"
              value={newBranchAddress}
              onChange={(e) => setNewBranchAddress(e.target.value)}
            />
            <button type="submit" className="os-btn" disabled={busy}>
              Criar filial
            </button>
          </form>
        </div>
      ) : null}

      {tab === "usuarios" ? (
        <div style={{ display: "grid", gap: "1.25rem" }}>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "0.5rem" }}>
            {users.map((u) => (
              <li
                key={u.id}
                style={{
                  border: "1px solid var(--os-border, #333)",
                  padding: "0.75rem",
                  borderRadius: 8,
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "0.75rem",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <strong>{u.name}</strong> · {u.email}
                  <div style={{ fontSize: "0.85rem" }}>
                    {u.role} · {u.isActive ? "ativo" : "inativo"}
                  </div>
                </div>
                <button
                  type="button"
                  className="os-btn"
                  disabled={busy}
                  onClick={() =>
                    void patchSettingsUser(u.id, { isActive: !u.isActive }).then(load)
                  }
                >
                  {u.isActive ? "Desativar" : "Ativar"}
                </button>
              </li>
            ))}
          </ul>
          <form onSubmit={addUser} style={{ display: "grid", gap: "0.75rem" }}>
            <h3>Novo usuário</h3>
            <input
              placeholder="Nome"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              required
            />
            <input
              type="email"
              placeholder="E-mail"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Senha (mín. 8)"
              value={userPassword}
              onChange={(e) => setUserPassword(e.target.value)}
              required
              minLength={8}
            />
            <select value={userRole} onChange={(e) => setUserRole(e.target.value)}>
              <option value="atendente">Atendente</option>
              <option value="gerente">Gerente</option>
              <option value="cozinha">Cozinha</option>
              <option value="entregador">Entregador</option>
              <option value="admin_cliente">Admin</option>
            </select>
            <select value={userBranchId} onChange={(e) => setUserBranchId(e.target.value)} required>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <button type="submit" className="os-btn" disabled={busy || !userBranchId}>
              Criar usuário
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
