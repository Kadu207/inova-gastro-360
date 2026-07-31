"use client";

import { useCallback, useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { apiFetch } from "@/lib/api";

type CashSession = {
  id: string;
  status: string;
  openingCents: number;
  openedAt: string;
  ledgerTotalCents: number;
};

type Dre = {
  revenueCents: number;
  expensesCents: number;
  resultCents: number;
};

const BRANCH_ID = process.env.NEXT_PUBLIC_DEMO_BRANCH_ID ?? "00000000-0000-4000-8000-000000000002";

export default function FinanceiroPage() {
  const [session, setSession] = useState<CashSession | null>(null);
  const [dre, setDre] = useState<Dre | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const cash = await apiFetch<{ session: CashSession | null }>(
        `/api/v1/finance/cash/branch/${BRANCH_ID}`,
      );
      setSession(cash.session);
      const d = await apiFetch<Dre>("/api/v1/finance/dre");
      setDre(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao carregar financeiro");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function openCash() {
    setBusy(true);
    try {
      await apiFetch("/api/v1/finance/cash/open", {
        method: "POST",
        body: JSON.stringify({ branchId: BRANCH_ID, openingCents: 0 }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao abrir caixa");
    } finally {
      setBusy(false);
    }
  }

  async function closeCash() {
    if (!session) return;
    setBusy(true);
    try {
      await apiFetch(`/api/v1/finance/cash/${session.id}/close`, {
        method: "POST",
        body: JSON.stringify({ closingCents: session.ledgerTotalCents }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao fechar caixa");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DashboardShell title="Financeiro">
      <section className="space-y-6 p-6">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">Caixa e DRE</h1>
          <p className="mt-1 text-sm opacity-70">
            Abertura/fechamento de caixa, sangria/suprimento e resultado gerencial.
          </p>
        </header>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div className="grid gap-6 md:grid-cols-2">
          <article className="space-y-3 border-t border-black/10 pt-4">
            <h2 className="text-lg font-medium">Caixa da filial</h2>
            {session ? (
              <>
                <p className="text-sm">
                  Aberto em {new Date(session.openedAt).toLocaleString("pt-BR")} — saldo ledger{" "}
                  {(session.ledgerTotalCents / 100).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </p>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void closeCash()}
                  className="rounded bg-black px-3 py-2 text-sm text-white disabled:opacity-50"
                >
                  Fechar caixa
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => void openCash()}
                className="rounded bg-black px-3 py-2 text-sm text-white disabled:opacity-50"
              >
                Abrir caixa
              </button>
            )}
          </article>

          <article className="space-y-3 border-t border-black/10 pt-4">
            <h2 className="text-lg font-medium">DRE (30 dias)</h2>
            {dre ? (
              <ul className="space-y-1 text-sm">
                <li>
                  Receita:{" "}
                  {(dre.revenueCents / 100).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </li>
                <li>
                  Despesas:{" "}
                  {(dre.expensesCents / 100).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </li>
                <li className="font-medium">
                  Resultado:{" "}
                  {(dre.resultCents / 100).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </li>
              </ul>
            ) : (
              <p className="text-sm opacity-60">Carregando…</p>
            )}
            <a className="text-sm underline" href="/api/v1/finance/export?format=csv">
              Exportar ledger CSV
            </a>
          </article>
        </div>
      </section>
    </DashboardShell>
  );
}
