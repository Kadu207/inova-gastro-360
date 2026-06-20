"use client";

import { useCallback, useEffect, useState } from "react";
import { API_BASE, DEMO_BRANCH_ID, formatBRL, getToken, realtimeWsUrl } from "@/lib/api";

interface Order {
  id: string;
  order_number: number;
  channel: string;
  status: string;
  customer_name: string | null;
  total_cents: number;
  created_at: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

const STATUSES = ["pending", "accepted", "preparing", "ready", "out_for_delivery", "delivered"] as const;
const PAGE_LIMIT = 10;

export default function PainelPage({ defaultFilter }: { title?: string; defaultFilter?: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState(defaultFilter ?? "");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination | null>(null);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) {
      window.location.href = "/login";
      return;
    }
    const statusQ = filter ? `&status=${filter}` : "";
    const res = await fetch(
      `${API_BASE}/api/v1/orders?branchId=${DEMO_BRANCH_ID}&page=${page}&limit=${PAGE_LIMIT}${statusQ}`,
      { headers: { authorization: `Bearer ${token}` } },
    );
    const data = await res.json();
    setOrders(data.orders ?? []);
    setPagination(data.pagination ?? null);
  }, [filter, page]);

  useEffect(() => {
    setPage(1);
  }, [filter]);

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);

    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(realtimeWsUrl(DEMO_BRANCH_ID));
      ws.onmessage = () => load();
    } catch {
      /* realtime offline — polling continua */
    }

    return () => {
      clearInterval(t);
      ws?.close();
    };
  }, [load]);

  async function updateStatus(orderId: string, status: string) {
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
    <div className="os-page">
      <div className="filters">
        <button type="button" onClick={() => setFilter("")}>
          Todos
        </button>
        {STATUSES.map((s) => (
          <button key={s} type="button" onClick={() => setFilter(s)}>
            {s}
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
          </span>
          <button type="button" onClick={handleNextPage} disabled={!pagination.hasMore} aria-label="Próxima página">
            Próxima →
          </button>
        </nav>
      )}
      <div className="orders-grid">
        {orders.map((o) => (
          <article key={o.id} className="order-card">
            <h3>
              #{o.order_number} — {o.channel}
            </h3>
            <p>Status: {o.status}</p>
            <p>{o.customer_name ?? "Cliente balcão/web"}</p>
            <p>{formatBRL(o.total_cents)}</p>
            <div className="actions">
              {o.status === "pending" && (
                <button type="button" onClick={() => updateStatus(o.id, "accepted")}>
                  Aceitar
                </button>
              )}
              {o.status === "accepted" && (
                <button type="button" onClick={() => updateStatus(o.id, "preparing")}>
                  Preparar
                </button>
              )}
              {o.status === "preparing" && (
                <button type="button" onClick={() => updateStatus(o.id, "ready")}>
                  Pronto
                </button>
              )}
              {o.status === "ready" && o.channel === "delivery" && (
                <button type="button" onClick={() => updateStatus(o.id, "out_for_delivery")}>
                  Enviar
                </button>
              )}
              {o.status === "out_for_delivery" && (
                <button type="button" onClick={() => updateStatus(o.id, "delivered")}>
                  Entregue
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
