"use client";

import { useCallback, useEffect, useState } from "react";
import {
  cashMovement,
  closeCashSession,
  createPayable,
  createReceivable,
  downloadFinanceExportCsv,
  fetchCurrentCashSession,
  fetchFinanceDre,
  fetchPayables,
  fetchReceivables,
  formatBRL,
  getActiveBranchId,
  openCashSession,
  payPayable,
  receiveReceivable,
  type CashSession,
  type FinanceAccount,
  type FinanceDre,
} from "@/lib/api";

export default function FinanceiroPage() {
  const branchId = getActiveBranchId();

  const [session, setSession] = useState<CashSession | null>(null);
  const [dre, setDre] = useState<FinanceDre | null>(null);
  const [payables, setPayables] = useState<FinanceAccount[]>([]);
  const [receivables, setReceivables] = useState<FinanceAccount[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cash, dreData, payablesData, receivablesData] = await Promise.all([
        fetchCurrentCashSession(branchId),
        fetchFinanceDre(),
        fetchPayables(),
        fetchReceivables(),
      ]);
      setSession(cash);
      setDre(dreData);
      setPayables(payablesData);
      setReceivables(receivablesData);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Erro ao carregar financeiro");
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function withBusy(action: () => Promise<void>) {
    setMessage("");
    setBusy(true);
    try {
      await action();
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Erro na operação");
    } finally {
      setBusy(false);
    }
  }

  function handleOpenCash() {
    return withBusy(() => openCashSession(branchId, 0).then(() => undefined));
  }

  function handleCloseCash() {
    if (!session) return;
    return withBusy(() => closeCashSession(session.id, session.ledgerTotalCents));
  }

  function handleMovement(kind: "sangria" | "suprimento") {
    if (!session) return;
    const amountStr = window.prompt(`Valor (R$) da ${kind === "sangria" ? "sangria" : "suprimento"}:`);
    if (!amountStr) return;
    const amountCents = Math.round(Number(amountStr.replace(",", ".")) * 100);
    if (!Number.isFinite(amountCents) || amountCents <= 0) return;
    const description = window.prompt("Descrição:") ?? kind;
    return withBusy(() => cashMovement(session.id, kind, amountCents, description));
  }

  function handleCreatePayable() {
    const description = window.prompt("Descrição da conta a pagar:");
    if (!description) return;
    const amountStr = window.prompt("Valor (R$):");
    const amountCents = Math.round(Number(amountStr?.replace(",", ".")) * 100);
    if (!Number.isFinite(amountCents) || amountCents <= 0) return;
    const dueDate = new Date(Date.now() + 7 * 86_400_000).toISOString();
    return withBusy(() => createPayable({ branchId, description, amountCents, dueDate }));
  }

  function handleCreateReceivable() {
    const description = window.prompt("Descrição da conta a receber:");
    if (!description) return;
    const amountStr = window.prompt("Valor (R$):");
    const amountCents = Math.round(Number(amountStr?.replace(",", ".")) * 100);
    if (!Number.isFinite(amountCents) || amountCents <= 0) return;
    const dueDate = new Date(Date.now() + 7 * 86_400_000).toISOString();
    return withBusy(() => createReceivable({ branchId, description, amountCents, dueDate }));
  }

  async function handleExport() {
    setMessage("");
    try {
      await downloadFinanceExportCsv();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Erro ao exportar");
    }
  }

  if (loading) return <p className="os-muted">Carregando financeiro…</p>;

  return (
    <div className="os-page">
      <h1>Financeiro</h1>
      {message && <p className="os-hint">{message}</p>}

      <section className="os-panel">
        <h2>Caixa da filial</h2>
        {session ? (
          <>
            <p>
              Aberto em {new Date(session.openedAt).toLocaleString("pt-BR")} — saldo em caixa{" "}
              <strong>{formatBRL(session.ledgerTotalCents)}</strong>
            </p>
            <div className="os-actions">
              <button type="button" className="os-btn-outline" disabled={busy} onClick={() => handleMovement("sangria")}>
                Sangria
              </button>
              <button type="button" className="os-btn-outline" disabled={busy} onClick={() => handleMovement("suprimento")}>
                Suprimento
              </button>
              <button type="button" className="os-btn-primary" disabled={busy} onClick={handleCloseCash}>
                Fechar caixa
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="os-muted">Nenhum caixa aberto nesta filial.</p>
            <button type="button" className="os-btn-primary" disabled={busy} onClick={handleOpenCash}>
              Abrir caixa
            </button>
          </>
        )}
      </section>

      <section className="os-panel">
        <h2>DRE gerencial (últimos 30 dias)</h2>
        {dre && (
          <ul className="os-dre-list">
            <li>Receita: {formatBRL(dre.revenueCents)}</li>
            <li>Despesas: {formatBRL(dre.expensesCents)}</li>
            <li>
              <strong>Resultado: {formatBRL(dre.resultCents)}</strong>
            </li>
          </ul>
        )}
        <button type="button" className="os-btn-outline" onClick={handleExport}>
          Exportar ledger (CSV)
        </button>
      </section>

      <section className="os-panel">
        <h2>Contas a pagar</h2>
        <button type="button" className="os-btn-outline" disabled={busy} onClick={handleCreatePayable}>
          Nova conta a pagar
        </button>
        <ul className="os-finance-list">
          {payables.map((p) => (
            <li key={p.id} className="os-finance-row">
              <span>
                {p.description} — {formatBRL(p.amount_cents)} — vence{" "}
                {new Date(p.due_date).toLocaleDateString("pt-BR")}
              </span>
              <span className={`os-badge-status ${p.status}`}>{p.status}</span>
              {p.status !== "paid" && (
                <button
                  type="button"
                  className="os-btn-outline"
                  disabled={busy}
                  onClick={() => withBusy(() => payPayable(p.id))}
                >
                  Marcar pago
                </button>
              )}
            </li>
          ))}
          {payables.length === 0 && <p className="os-muted">Nenhuma conta a pagar cadastrada.</p>}
        </ul>
      </section>

      <section className="os-panel">
        <h2>Contas a receber</h2>
        <button type="button" className="os-btn-outline" disabled={busy} onClick={handleCreateReceivable}>
          Nova conta a receber
        </button>
        <ul className="os-finance-list">
          {receivables.map((r) => (
            <li key={r.id} className="os-finance-row">
              <span>
                {r.description} — {formatBRL(r.amount_cents)} — vence{" "}
                {new Date(r.due_date).toLocaleDateString("pt-BR")}
              </span>
              <span className={`os-badge-status ${r.status}`}>{r.status}</span>
              {r.status !== "received" && (
                <button
                  type="button"
                  className="os-btn-outline"
                  disabled={busy}
                  onClick={() => withBusy(() => receiveReceivable(r.id))}
                >
                  Marcar recebido
                </button>
              )}
            </li>
          ))}
          {receivables.length === 0 && <p className="os-muted">Nenhuma conta a receber cadastrada.</p>}
        </ul>
      </section>
    </div>
  );
}
