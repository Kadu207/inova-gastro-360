"use client";

import { useEffect, useState } from "react";
import { API_BASE, formatBRL, getActiveBranchId, getToken } from "@/lib/api";

const KPIS = [
  { label: "Vendas hoje", value: "R$ 4.280,00", delta: "+12,5%" },
  { label: "Pedidos hoje", value: "86", delta: "+8,2%" },
  { label: "Ticket médio", value: "R$ 49,80", delta: "+3,1%" },
  { label: "Novos clientes", value: "14", delta: "+5" },
];

const SALES_WEEK = [62, 48, 71, 55, 80, 67, 74];
const TOP_PRODUCTS = [
  { name: "Combo Smash", pct: 92 },
  { name: "Burger Bacon", pct: 78 },
  { name: "Batata Rústica", pct: 65 },
  { name: "Coca-Cola", pct: 52 },
];

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

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    fetch(`${API_BASE}/api/v1/orders?branchId=${getActiveBranchId()}`, {
      headers: { authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => setOrders((d.orders ?? []).slice(0, 5)))
      .catch(() => {});
  }, []);

  return (
    <div className="os-dashboard">
      <section className="os-kpi-row">
        {KPIS.map((k) => (
          <article key={k.label} className="os-kpi-card">
            <span className="os-kpi-label">{k.label}</span>
            <strong className="os-kpi-value">{k.value}</strong>
            <span className="os-kpi-delta">{k.delta}</span>
          </article>
        ))}
      </section>

      <div className="os-dashboard-grid">
        <section className="os-panel os-panel-wide">
          <h2>Vendas (últimos 7 dias)</h2>
          <div className="os-bar-chart">
            {SALES_WEEK.map((h, i) => (
              <div key={i} className="os-bar-wrap">
                <div className="os-bar" style={{ height: `${h}%` }} />
              </div>
            ))}
          </div>
        </section>

        <section className="os-panel">
          <h2>Vendas por canal</h2>
          <div className="os-donut" style={{ background: "conic-gradient(#22c55e 0 62%, #3b82f6 62% 90%, #f59e0b 90%)" }} />
          <ul className="os-legend">
            <li><span className="dot green" /> Delivery 62%</li>
            <li><span className="dot blue" /> Balcão 28%</li>
            <li><span className="dot amber" /> Retirada 10%</li>
          </ul>
        </section>

        <section className="os-panel">
          <h2>Produtos mais vendidos</h2>
          {TOP_PRODUCTS.map((p) => (
            <div key={p.name} className="os-progress-row">
              <span>{p.name}</span>
              <div className="os-progress-track">
                <div className="os-progress-fill" style={{ width: `${p.pct}%` }} />
              </div>
            </div>
          ))}
        </section>

        <section className="os-panel">
          <h2>Formas de pagamento</h2>
          <div className="os-donut small" style={{ background: "conic-gradient(#22c55e 0 46%, #6366f1 46% 78%, #94a3b8 78%)" }} />
          <ul className="os-legend">
            <li>PIX 46%</li>
            <li>Cartão 32%</li>
            <li>Dinheiro 22%</li>
          </ul>
        </section>

        <section className="os-panel">
          <h2>Resumo financeiro</h2>
          <dl className="os-finance-summary">
            <div><dt>Receita</dt><dd>R$ 4.280</dd></div>
            <div><dt>Despesas</dt><dd>R$ 2.320</dd></div>
            <div><dt>Lucro líquido</dt><dd className="green">R$ 1.960</dd></div>
            <div><dt>Margem</dt><dd>45,8%</dd></div>
          </dl>
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
                  <span className={`os-badge-status ${o.status}`}>{STATUS_LABEL[o.status] ?? o.status}</span>
                </div>
                <span>{o.channel} · {formatBRL(o.total_cents)}</span>
              </article>
            ))
          )}
        </aside>

        <aside className="os-panel os-kds-preview">
          <h2>Cozinha (KDS)</h2>
          <div className="os-kds-columns">
            <div>
              <h3>Em preparo</h3>
              {orders.filter((o) => o.status === "preparing" || o.status === "accepted").map((o) => (
                <div key={o.id} className="os-kds-card">#{o.order_number}</div>
              ))}
            </div>
            <div>
              <h3>Prontos</h3>
              {orders.filter((o) => o.status === "ready").map((o) => (
                <div key={o.id} className="os-kds-card ready">#{o.order_number}</div>
              ))}
            </div>
          </div>
        </aside>

        <section className="os-panel os-mobile-preview">
          <h2>App cliente</h2>
          <div className="os-phone">
            <div className="os-phone-screen">
              <p className="os-phone-title">Seu pedido</p>
              <p>Combo Smash ×1</p>
              <p>Batata Rústica ×1</p>
              <p>Coca-Cola ×1</p>
              <hr />
              <p>Total <strong>R$ 49,90</strong></p>
              <button type="button" className="os-btn-primary">Finalizar pedido</button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
