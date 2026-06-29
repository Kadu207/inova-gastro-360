import { describe, it, expect, vi } from "vitest";
import type { PrintAgentApiClient, PrintJobRow } from "./api-client";
import { processPendingJobs } from "./poller";
import { loadConfig } from "./config";
import { createPrintSink } from "./escpos/printer";
import { buildA4Receipt } from "./a4/receipt";
import { parsePrintPayload } from "./escpos/ticket";

const sampleJob: PrintJobRow = {
  id: "job-retry-1",
  branch_id: "b",
  order_id: "o",
  sector: "cozinha",
  status: "pending",
  payload: { orderNumber: 9, items: [{ productName: "Burger", quantity: 1 }] },
  created_at: new Date().toISOString(),
};

function mockClient(jobs: PrintJobRow[]): PrintAgentApiClient & {
  printed: string[];
  failed: string[];
} {
  const printed: string[] = [];
  const failed: string[] = [];
  return {
    printed,
    failed,
    fetchPendingJobs: vi.fn(async () => jobs),
    markPrinted: vi.fn(async (id: string) => {
      printed.push(id);
    }),
    markFailed: vi.fn(async (id: string) => {
      failed.push(id);
    }),
    updateJobStatus: vi.fn(),
    login: vi.fn(),
  } as unknown as PrintAgentApiClient & { printed: string[]; failed: string[] };
}

describe("processPendingJobs — retry (T014)", () => {
  it("marca failed após esgotar tentativas", async () => {
    const cfg = loadConfig({
      PRINT_AGENT_POLL_MS: "5000",
      PRINT_AGENT_MAX_RETRIES: "2",
      PRINTER_TYPE: "file",
      PRINTER_DEVICE: "/invalid/no-such-device",
    });
    const client = mockClient([sampleJob]);
    const sink = createPrintSink(cfg.printer);
    const failures = new Map<string, number>();
    const logs: string[] = [];

    await processPendingJobs(client, cfg, sink, failures, (m) => logs.push(m));
    expect(failures.get(sampleJob.id)).toBe(1);
    expect(client.printed).toHaveLength(0);

    await processPendingJobs(client, cfg, sink, failures, (m) => logs.push(m));
    expect(client.failed).toEqual([sampleJob.id]);
    expect(failures.has(sampleJob.id)).toBe(false);
    expect(logs.some((l) => l.includes("[failed]"))).toBe(true);
  });

  it("marca printed em sucesso (modo none)", async () => {
    const cfg = loadConfig({ PRINT_AGENT_POLL_MS: "5000", PRINTER_TYPE: "none" });
    const client = mockClient([sampleJob]);
    const sink = createPrintSink(cfg.printer);
    const failures = new Map<string, number>();

    await processPendingJobs(client, cfg, sink, failures);
    expect(client.printed).toEqual([sampleJob.id]);
    expect(client.failed).toHaveLength(0);
  });
});

describe("buildA4Receipt (T013)", () => {
  it("gera comanda texto com total", () => {
    const buf = buildA4Receipt(
      parsePrintPayload({
        orderNumber: 42,
        items: [{ productName: "Smash", quantity: 2, unitCents: 2990, totalCents: 5980 }],
      }),
      "a4",
    );
    const text = buf.toString("utf8");
    expect(text).toContain("Pedido");
    expect(text).toContain("#42");
    expect(text).toContain("Smash");
    expect(text).toContain("TOTAL");
    expect(text).toContain("R$");
  });
});
