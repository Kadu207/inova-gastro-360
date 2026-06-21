import { describe, it, expect } from "vitest";
import { loadConfig } from "./config";
import { formatJobLog } from "./poller";

describe("print-agent config", () => {
  it("carrega defaults de dev", () => {
    const cfg = loadConfig({
      PRINT_AGENT_API_BASE: "http://127.0.0.1:8792",
      PRINT_AGENT_BRANCH_ID: "00000000-0000-4000-8000-000000000002",
      PRINT_AGENT_SECTOR: "cozinha",
      PRINT_AGENT_POLL_MS: "5000",
    });
    expect(cfg.apiBase).toBe("http://127.0.0.1:8792");
    expect(cfg.sector).toBe("cozinha");
    expect(cfg.pollIntervalMs).toBe(5000);
  });

  it("rejeita poll interval inválido", () => {
    expect(() => loadConfig({ PRINT_AGENT_POLL_MS: "100" })).toThrow(/PRINT_AGENT_POLL_MS/);
  });
});

describe("print-agent poller", () => {
  it("formata log do job", () => {
    const line = formatJobLog({
      id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      branch_id: "b",
      order_id: "o",
      sector: "cozinha",
      status: "pending",
      payload: { orderNumber: 1001, items: [] },
      created_at: new Date().toISOString(),
    });
    expect(line).toContain("order=#1001");
    expect(line).toContain("cozinha");
  });
});
