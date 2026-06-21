import { describe, it, expect } from "vitest"
import { loadConfig, loadPrinterConfig } from "./config"
import { formatJobLog, printJobTicket } from "./poller"
import { buildKitchenTicket, parsePrintPayload } from "./escpos/ticket"
import { createPrintSink } from "./escpos/printer"

describe("print-agent config", () => {
  it("carrega defaults de dev", () => {
    const cfg = loadConfig({
      PRINT_AGENT_API_BASE: "http://127.0.0.1:8792",
      PRINT_AGENT_BRANCH_ID: "00000000-0000-4000-8000-000000000002",
      PRINT_AGENT_SECTOR: "cozinha",
      PRINT_AGENT_POLL_MS: "5000",
    })
    expect(cfg.apiBase).toBe("http://127.0.0.1:8792")
    expect(cfg.sector).toBe("cozinha")
    expect(cfg.pollIntervalMs).toBe(5000)
    expect(cfg.printer.type).toBe("none")
  })

  it("rejeita poll interval inválido", () => {
    expect(() => loadConfig({ PRINT_AGENT_POLL_MS: "100" })).toThrow(/PRINT_AGENT_POLL_MS/)
  })

  it("carrega impressora de rede", () => {
    const printer = loadPrinterConfig({
      PRINTER_TYPE: "network",
      PRINTER_HOST: "192.168.0.50",
      PRINTER_PORT: "9100",
    })
    expect(printer.type).toBe("network")
    expect(printer.host).toBe("192.168.0.50")
    expect(printer.port).toBe(9100)
  })
})

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
    })
    expect(line).toContain("order=#1001")
    expect(line).toContain("cozinha")
  })

  it("modo none faz log do payload sem enviar bytes", async () => {
    const logs: string[] = []
    const cfg = loadConfig({ PRINT_AGENT_POLL_MS: "5000", PRINTER_TYPE: "none" })
    const sink = createPrintSink(cfg.printer)
    const ok = await printJobTicket(
      {
        id: "job-1",
        branch_id: "b",
        order_id: "o",
        sector: "cozinha",
        status: "pending",
        payload: { orderNumber: 42, items: [{ productName: "Burger", quantity: 1 }] },
        created_at: new Date().toISOString(),
      },
      cfg,
      sink,
      (m) => logs.push(m),
    )
    expect(ok).toBe(true)
    expect(logs.some((l) => l.includes("Burger"))).toBe(true)
  })
})

describe("escpos ticket", () => {
  it("monta bytes com número do pedido e itens", () => {
    const payload = parsePrintPayload({
      orderNumber: 1001,
      items: [{ productName: "X-Burger", quantity: 2, notes: "sem cebola" }],
    })
    const buf = buildKitchenTicket(payload, "cozinha")
    const text = buf.toString("latin1")
    expect(text).toContain("Pedido #1001")
    expect(text).toContain("COZINHA")
    expect(text).toContain("2x X-Burger")
    expect(text).toContain("sem cebola")
  })

  it("rotula setor balcao", () => {
    const buf = buildKitchenTicket({ orderNumber: 1, items: [] }, "balcao")
    expect(buf.toString("latin1")).toContain("BALCAO")
  })
})
