"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createErasureRequest,
  fetchErasureRequests,
  fetchTitularExport,
  updateErasureRequestStatus,
  type ErasureRequestSummary,
} from "@/lib/lgpd";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  in_progress: "Em andamento",
  completed: "Concluída",
  rejected: "Rejeitada",
};

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function LgpdPage() {
  const [requests, setRequests] = useState<ErasureRequestSummary[]>([]);
  const [subjectId, setSubjectId] = useState("");
  const [subjectType, setSubjectType] = useState<"customer" | "user">("customer");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const rows = await fetchErasureRequests();
      setRequests(rows);
    } catch {
      // usuário sem permissão de admin — seção de solicitações fica vazia
      setRequests([]);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleExport() {
    setError("");
    setMessage("");
    try {
      const data = await fetchTitularExport();
      downloadJson(data, `inova-gastro-360-meus-dados-${Date.now()}.json`);
      setMessage("Exportação gerada — verifique o download.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao exportar dados");
    }
  }

  async function handleCreate() {
    setError("");
    setMessage("");
    if (!subjectId.trim()) {
      setError("Informe o identificador do titular (e-mail/telefone/ID)");
      return;
    }
    setBusy(true);
    try {
      await createErasureRequest(subjectId.trim(), subjectType, reason.trim() || undefined);
      setSubjectId("");
      setReason("");
      setMessage("Solicitação registrada.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao registrar solicitação");
    } finally {
      setBusy(false);
    }
  }

  async function handleStatusChange(id: string, status: "in_progress" | "completed" | "rejected") {
    setError("");
    try {
      await updateErasureRequestStatus(id, status);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao atualizar solicitação");
    }
  }

  return (
    <div className="os-page">
      <h1>Privacidade &amp; LGPD</h1>
      <p className="os-hint">
        Consentimento de cookies, exportação de dados do titular e direito ao esquecimento — Lei
        13.709/2018 (LGPD).
      </p>

      {message && <p className="catalog-message catalog-message-ok">{message}</p>}
      {error && <p className="catalog-message catalog-message-error">{error}</p>}

      <section className="os-panel" style={{ gridColumn: "span 12", marginBottom: "1rem" }}>
        <h2>Meus dados (titular)</h2>
        <p className="os-muted">
          Exporte em JSON os dados pessoais associados à sua conta: perfil, sessões, consentimentos
          de cookies, solicitações de esquecimento e trilha de auditoria.
        </p>
        <button type="button" className="os-btn-primary" style={{ width: "auto" }} onClick={() => void handleExport()}>
          Baixar meus dados (JSON)
        </button>
      </section>

      <section className="os-panel" style={{ gridColumn: "span 12", marginBottom: "1rem" }}>
        <h2>Nova solicitação de esquecimento</h2>
        <p className="os-muted">
          Disponível para administradores do tenant. Registre pedidos de exclusão de dados de
          clientes (telefone/e-mail) ou de um usuário do sistema.
        </p>
        <div className="catalog-admin-form-row">
          <label>
            Identificador do titular
            <input
              type="text"
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              placeholder="cliente@exemplo.com ou telefone"
            />
          </label>
          <label>
            Tipo
            <select value={subjectType} onChange={(e) => setSubjectType(e.target.value as "customer" | "user")}>
              <option value="customer">Cliente</option>
              <option value="user">Usuário do sistema</option>
            </select>
          </label>
          <label>
            Motivo (opcional)
            <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex.: solicitado via WhatsApp" />
          </label>
          <button type="button" className="catalog-admin-btn-primary" disabled={busy} onClick={() => void handleCreate()}>
            Registrar solicitação
          </button>
        </div>
      </section>

      <section className="os-panel" style={{ gridColumn: "span 12" }}>
        <h2>Solicitações de esquecimento</h2>
        {!loaded && <p className="os-muted">Carregando…</p>}
        {loaded && requests.length === 0 && (
          <p className="panel-empty">Nenhuma solicitação registrada (ou você não tem permissão de administrador).</p>
        )}
        {requests.length > 0 && (
          <ul className="catalog-admin-list__ul catalog-admin-products">
            {requests.map((r) => (
              <li key={r.id} className="catalog-admin-item">
                <div>
                  <strong>{r.subject_id}</strong>
                  <span className="catalog-admin-meta">
                    {r.subject_type === "customer" ? "Cliente" : "Usuário"} · {STATUS_LABELS[r.status] ?? r.status} ·{" "}
                    {new Date(r.created_at).toLocaleString("pt-BR")}
                  </span>
                  {r.reason && <span className="catalog-admin-meta">Motivo: {r.reason}</span>}
                </div>
                {(r.status === "pending" || r.status === "in_progress") && (
                  <div className="catalog-admin-actions">
                    {r.status === "pending" && (
                      <button type="button" onClick={() => void handleStatusChange(r.id, "in_progress")}>
                        Iniciar
                      </button>
                    )}
                    <button type="button" onClick={() => void handleStatusChange(r.id, "completed")}>
                      Concluir
                    </button>
                    <button type="button" onClick={() => void handleStatusChange(r.id, "rejected")}>
                      Rejeitar
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
