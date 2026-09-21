"use client";

import { useEffect, useState } from "react";
import {
  fetchDashboardSummary,
  fetchOrdersFeed,
  formatBRL,
  getActiveBranchId,
  type DashboardSummary,
} from "@/lib/api";

interface Order {
  id: string;
  order_number: number;
  channel: string;
  status: string;
  total_cents: number;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Novo",
  accepted: "Aceito",
  preparing: "Em preparo",
  ready: "Pronto",
  out_for_delivery: "Enviado",
  delivered: "Entregue",
};

export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [loadingKpis, setLoadingKpis] = useState(true);

  useEffect(() => {
    const branchId = getActiveBranchId();
    if (!branchId) {
      setLoadingKpis(false);
      setSummaryError("Selecione uma filial");
      return;
    }

    let active = true;
    setLoadingKpis(true);
    void fetchDashboardSummary(branchId)
      .then((data) => {
        if (!active) return;
        setSummary(data);
        setSummaryError(null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setSummary(null);
        setSummaryError(err instanceof Error ? err.message : "summary_failed");
      })
      .finally(() => {
        if (active) setLoadingKpis(false);
      });

    void fetchOrdersFeed(branchId)
      .then((list) => {
        if (active) setOrders(list.slice(0, 5));
      })
      .catch(() => {
        if (active) setOrders([]);
      });

    return () => {
      active = false;
    };
  }, []);

  const kpis = summary?.kpis;
  const week = summary?.series.salesLast7Days ?? [];
  const maxWeek = Math.max(1, ...week.map((d) => d.salesCents));

  return (
    <div className="os-dashboard">
      <section className="os-kpi-row" aria-live="polite">
        <article className="os-kpi-card">
          <span className="os-kpi-label">Vendas hoje</span>
          <strong className="os-kpi-value">
            {loadingKpis ? "…" : formatBRL(kpis?.salesCentsToday ?? 0)}
          </strong>
          <span className="os-kpi-delta">{summary?.dayBasis === "utc" ? "dia UTC" : (summary?.timezone ?? "—")}</span>
        </article>
        <article className="os-kpi-card">
          <span className="os-kpi-label">Pedidos hoje</span>
          <strong className="os-kpi-value">
            {loadingKpis ? "…" : String(kpis?.ordersToday ?? 0)}
          </strong>
          <span className="os-kpi-delta">filial ativa</span>
        </article>
        <article className="os-kpi-card">
          <span className="os-kpi-label">Ticket médio</span>
          <strong className="os-kpi-value">
            {loadingKpis ? "…" : formatBRL(kpis?.avgTicketCentsToday ?? 0)}
          </strong>
          <span className="os-kpi-delta">hoje</span>
        </article>
        <article className="os-kpi-card os-kpi-card-muted" title="Disponível na Onda 4 (Clientes)">
          <span className="os-kpi-label">Novos clientes</span>
          <strong className="os-kpi-value">—</strong>
          <span className="os-kpi-delta">Em breve</span>
        </article>
      </section>
      {summaryError ? <p className="os-muted">KPIs: {summaryError}</p> : null}

      <div className="os-dashboard-grid">
        <section className="os-panel os-panel-wide">
          <h2>Vendas (últimos 7 dias)</h2>
          {week.length === 0 ? (
            <p className="os-muted">Sem série ainda.</p>
          ) : (
            <div className="os-bar-chart" role="img" aria-label="Vendas dos últimos 7 dias">
              {week.map((d) => (
                <div key={d.date} className="os-bar-wrap" title={`${d.date}: ${formatBRL(d.salesCents)}`}>
                  <div
                    className="os-bar"
                    style={{ height: `${Math.max(4, Math.round((d.salesCents / maxWeek) * 100))}%` }}
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="os-panel">
          <h2>Vendas por canal</h2>
          <p className="os-muted">Em breve (Relatórios — Onda 4)</p>
        </section>

        <section className="os-panel">
          <h2>Produtos mais vendidos</h2>
          <p className="os-muted">Em breve (Relatórios — Onda 4)</p>
        </section>

        <section className="os-panel">
          <h2>Formas de pagamento</h2>
          <p className="os-muted">Em breve (Relatórios — Onda 4)</p>
        </section>

        <section className="os-panel">
          <h2>Resumo financeiro</h2>
          <p className="os-muted">Use Financeiro no menu para caixa e DRE.</p>
          <button type="button" className="os-btn-outline" disabled>
            Ver relatório completo (Onda 4)
          </button>
        </section>

        <aside className="os-panel os-orders-feed">
          <h2>Pedidos</h2>
          {orders.length === 0 ? (
            <p className="os-muted">Nenhum pedido — crie um no cardápio.</p>
          ) : (
            orders.map((o) => (
              <article key={o.id} className="os-order-row">
                <div>
                  <strong>#{o.order_number}</strong>
                  <span className={`os-badge-status ${o.status}`}>
                    {STATUS_LABEL[o.status] ?? o.status}
                  </span>
                </div>
                <span>
                  {o.channel} · {formatBRL(o.total_cents)}
                </span>
              </article>
            ))
          )}
        </aside>

        <aside className="os-panel os-kds-preview">
          <h2>Cozinha (KDS)</h2>
          <div className="os-kds-columns">
            <div>
              <h3>Em preparo</h3>
              {orders
                .filter((o) => o.status === "preparing" || o.status === "accepted")
                .map((o) => (
                  <div key={o.id} className="os-kds-card">
                    #{o.order_number}
                  </div>
                ))}
            </div>
            <div>
              <h3>Prontos</h3>
              {orders
                .filter((o) => o.status === "ready")
                .map((o) => (
                  <div key={o.id} className="os-kds-card ready">
                    #{o.order_number}
                  </div>
                ))}
            </div>
          </div>
        </aside>

        <section className="os-panel os-mobile-preview">
          <h2>App cliente</h2>
          <p className="os-muted">Pré-visualização ilustrativa (não é dado ao vivo).</p>
          <div className="os-phone">
            <div className="os-phone-screen">
              <p className="os-phone-title">Seu pedido</p>
              <p>Abra o cardápio público para pedir.</p>
              <button type="button" className="os-btn-primary" disabled>
                Finalizar pedido
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
