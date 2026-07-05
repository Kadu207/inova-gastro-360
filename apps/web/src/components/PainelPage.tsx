"use client";

import { useCallback, useEffect, useState } from "react";
import { API_BASE, formatBRL, getActiveBranchId, getToken, realtimeWsUrl } from "@/lib/api";
import {
  buildOrdersQueryParams,
  CHANNEL_LABELS,
  formatOrderDate,
  nextStatusAction,
  ORDER_CHANNELS,
  ORDER_STATUSES,
  STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  type OrderChannel,
  type OrderStatus,
} from "@/lib/pedidos";

interface Order {
  id: string;
  order_number: number;
  channel: string;
  status: string;
  customer_name: string | null;
  customer_phone: string | null;
  total_cents: number;
  payment_status?: string;
  created_at: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

const PAGE_LIMIT = 10;

export type PainelPageProps = {
  defaultFilter?: string;
  defaultChannel?: string;
  /** Status exibidos nos botões — omitir = todos */
  statusOptions?: readonly OrderStatus[];
};

export default function PainelPage({
  defaultFilter = "",
  defaultChannel = "",
  statusOptions,
}: PainelPageProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState(defaultFilter);
  const [channel, setChannel] = useState(defaultChannel);
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(false);

  const visibleStatuses = statusOptions ?? ORDER_STATUSES;

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [filter, channel, searchDebounced]);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) {
      window.location.href = "/login";
      return;
    }
    setLoading(true);
    try {
      const qs = buildOrdersQueryParams({
        branchId: getActiveBranchId(),
        page,
        limit: PAGE_LIMIT,
        status: filter || undefined,
        channel: channel || undefined,
        q: searchDebounced || undefined,
      });
      const res = await fetch(`${API_BASE}/api/v1/orders?${qs}`, {
        headers: { authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setOrders(data.orders ?? []);
      setPagination(data.pagination ?? null);
    } finally {
      setLoading(false);
    }
  }, [filter, channel, searchDebounced, page]);

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);

    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(realtimeWsUrl(getActiveBranchId()));
      ws.onmessage = () => load();
    } catch {
      /* realtime offline — polling continua */
    }

    return () => {
      clearInterval(t);
      ws?.close();
    };
  }, [load]);

  async function updateStatus(orderId: string, status: OrderStatus) {
    const token = getToken();
    await fetch(`${API_BASE}/api/v1/orders/${orderId}/status`, {
      method: "PATCH",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    });
    load();
  }

  function handlePrevPage() {
    setPage((p) => Math.max(1, p - 1));
  }

  function handleNextPage() {
    if (pagination?.hasMore) setPage((p) => p + 1);
  }

  return (
    <div className="os-page painel-page">
      <div className="panel-toolbar">
        <input
          type="search"
          className="panel-search"
          placeholder="Buscar nº, nome ou telefone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Buscar pedidos"
        />
        <div className="panel-channel-filters" role="group" aria-label="Canal">
          <button type="button" className={!channel ? "active" : ""} onClick={() => setChannel("")}>
            Todos canais
          </button>
          {ORDER_CHANNELS.map((c) => (
            <button
              key={c}
              type="button"
              className={channel === c ? "active" : ""}
              onClick={() => setChannel(c)}
            >
              {CHANNEL_LABELS[c]}
            </button>
          ))}
        </div>
      </div>

      <div className="filters" role="group" aria-label="Status">
        <button type="button" className={!filter ? "active" : ""} onClick={() => setFilter("")}>
          Todos status
        </button>
        {visibleStatuses.map((s) => (
          <button key={s} type="button" className={filter === s ? "active" : ""} onClick={() => setFilter(s)}>
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {pagination && pagination.totalPages > 0 && (
        <nav className="pagination" aria-label="Paginação de pedidos">
          <button type="button" onClick={handlePrevPage} disabled={page <= 1} aria-label="Página anterior">
            ← Anterior
          </button>
          <span>
            Página {pagination.page} de {pagination.totalPages} ({pagination.total} pedidos)
            {loading ? " · atualizando…" : ""}
          </span>
          <button type="button" onClick={handleNextPage} disabled={!pagination.hasMore} aria-label="Próxima página">
            Próxima →
          </button>
        </nav>
      )}

      {orders.length === 0 && !loading && <p className="panel-empty">Nenhum pedido encontrado.</p>}

      <div className="orders-grid">
        {orders.map((o) => {
          const action = nextStatusAction(o.status, o.channel);
          const channelKey = o.channel as OrderChannel;
          return (
            <article key={o.id} className={`order-card order-card--${o.status}`}>
              <header className="order-card-header">
                <h3>#{o.order_number}</h3>
                <span className="order-badge order-badge--channel">
                  {CHANNEL_LABELS[channelKey] ?? o.channel}
                </span>
              </header>
              <p className="order-status">
                <span className={`order-badge order-badge--status order-badge--${o.status}`}>
                  {STATUS_LABELS[o.status as OrderStatus] ?? o.status}
                </span>
                {o.payment_status && o.payment_status !== "unpaid" && (
                  <span className="order-badge order-badge--payment">
                    {PAYMENT_STATUS_LABELS[o.payment_status] ?? o.payment_status}
                  </span>
                )}
              </p>
              <p className="order-customer">{o.customer_name ?? "Cliente balcão/web"}</p>
              {o.customer_phone && <p className="order-phone">{o.customer_phone}</p>}
              <p className="order-meta">{formatOrderDate(o.created_at)}</p>
              <p className="order-total">{formatBRL(o.total_cents)}</p>
              {action && (
                <div className="actions">
                  <button type="button" onClick={() => updateStatus(o.id, action.next)}>
                    {action.label}
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
