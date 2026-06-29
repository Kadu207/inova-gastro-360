export const ORDER_STATUSES = [
  "pending",
  "accepted",
  "preparing",
  "ready",
  "out_for_delivery",
  "delivered",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_CHANNELS = ["web", "balcao", "delivery"] as const;

export type OrderChannel = (typeof ORDER_CHANNELS)[number];

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pendente",
  accepted: "Aceito",
  preparing: "Preparando",
  ready: "Pronto",
  out_for_delivery: "Saiu p/ entrega",
  delivered: "Entregue",
  cancelled: "Cancelado",
};

export const CHANNEL_LABELS: Record<OrderChannel, string> = {
  web: "Web / retirada",
  balcao: "Balcão",
  delivery: "Delivery",
};

export function buildOrdersQueryParams(params: {
  branchId: string;
  page: number;
  limit: number;
  status?: string;
  channel?: string;
  q?: string;
}): string {
  const sp = new URLSearchParams();
  sp.set("branchId", params.branchId);
  sp.set("page", String(params.page));
  sp.set("limit", String(params.limit));
  if (params.status) sp.set("status", params.status);
  if (params.channel) sp.set("channel", params.channel);
  if (params.q?.trim()) sp.set("q", params.q.trim());
  return sp.toString();
}

export function formatOrderDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function nextStatusAction(
  status: string,
  channel: string,
): { label: string; next: OrderStatus } | null {
  if (status === "pending") return { label: "Aceitar", next: "accepted" };
  if (status === "accepted") return { label: "Preparar", next: "preparing" };
  if (status === "preparing") return { label: "Pronto", next: "ready" };
  if (status === "ready" && channel === "delivery") return { label: "Enviar", next: "out_for_delivery" };
  if (status === "out_for_delivery") return { label: "Entregue", next: "delivered" };
  if (status === "ready" && channel !== "delivery") return { label: "Entregue", next: "delivered" };
  return null;
}
