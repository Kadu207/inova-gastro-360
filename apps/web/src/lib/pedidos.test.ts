import { describe, it, expect } from "vitest";
import {
  buildOrdersQueryParams,
  CHANNEL_LABELS,
  nextStatusAction,
  STATUS_LABELS,
} from "./pedidos";

describe("pedidos helpers", () => {
  it("monta query string com filtros", () => {
    const qs = buildOrdersQueryParams({
      branchId: "branch-1",
      page: 2,
      limit: 10,
      status: "pending",
      channel: "delivery",
      q: "Joao",
    });
    expect(new URLSearchParams(qs).get("branchId")).toBe("branch-1");
    expect(new URLSearchParams(qs).get("status")).toBe("pending");
    expect(new URLSearchParams(qs).get("channel")).toBe("delivery");
    expect(new URLSearchParams(qs).get("q")).toBe("Joao");
  });

  it("labels em português", () => {
    expect(STATUS_LABELS.pending).toBe("Pendente");
    expect(CHANNEL_LABELS.delivery).toBe("Delivery");
  });

  it("nextStatusAction para delivery", () => {
    expect(nextStatusAction("ready", "delivery")).toEqual({ label: "Enviar", next: "out_for_delivery" });
    expect(nextStatusAction("ready", "web")).toEqual({ label: "Entregue", next: "delivered" });
    expect(nextStatusAction("delivered", "web")).toBeNull();
  });
});
