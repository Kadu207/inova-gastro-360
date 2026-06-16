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

const STATUSES = ["pending", "accepted", "preparing", "ready", "out_for_delivery", "delivered"] as const;

export default function PainelPage({ defaultFilter }: { title?: string; defaultFilter?: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState(defaultFilter ?? "");

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) {
      window.location.href = "/login";
      return;
    }
    const q = filter ? `&status=${filter}` : "";
    const res = await fetch(`${API_BASE}/api/v1/orders?branchId=${DEMO_BRANCH_ID}${q}`, {
      headers: { authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setOrders(data.orders ?? []);
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
