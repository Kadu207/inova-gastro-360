import type { PrintAgentConfig } from "./config"
import { PrintAgentApiClient, type PrintJobRow } from "./api-client"
import { createPrintSink, type PrintSink } from "./escpos/printer"
import { buildKitchenTicket, parsePrintPayload } from "./escpos/ticket"

export function formatJobLog(job: PrintJobRow): string {
  const payload = job.payload ?? {}
  const orderNumber = payload.orderNumber ?? "?"
  return `[print] job=${job.id.slice(0, 8)}… order=#${orderNumber} sector=${job.sector}`
}

export async function printJobTicket(
  job: PrintJobRow,
  config: PrintAgentConfig,
  sink: PrintSink,
  log: (msg: string) => void,
): Promise<boolean> {
  const payload = parsePrintPayload(job.payload ?? {})

  if (config.printer.type === "none") {
    log(JSON.stringify(job.payload))
    return true
  }

  const ticket = buildKitchenTicket(payload, job.sector)
  log(`[escpos] enviando ${ticket.length} bytes → ${config.printer.type} (${sink.mode})`)

  try {
    await sink.print(ticket)
    log(`[escpos] impresso job=${job.id}`)
    return true
  } catch (err) {
    log(`[escpos] falha job=${job.id}: ${err instanceof Error ? err.message : String(err)}`)
    return false
  }
}

export async function processPendingJobs(
  client: PrintAgentApiClient,
  config: PrintAgentConfig,
  sink: PrintSink,
  log: (msg: string) => void = console.log,
): Promise<number> {
  const jobs = await client.fetchPendingJobs()
  if (!jobs.length) return 0

  for (const job of jobs) {
    log(formatJobLog(job))

    if (config.dryRun) {
      log(`[dry-run] skip impressão e PATCH job=${job.id}`)
      continue
    }

    const printed = await printJobTicket(job, config, sink, log)
    if (!printed) continue

    await client.markPrinted(job.id)
    log(`[ok] marcado printed job=${job.id}`)
  }

  return jobs.length
}

export async function runPollLoop(
  client: PrintAgentApiClient,
  config: PrintAgentConfig,
  log: (msg: string) => void = console.log,
): Promise<never> {
  const sink = createPrintSink(config.printer)
  const printerInfo =
    config.printer.type === "none"
      ? "modo=log (sem impressora)"
      : config.printer.type === "network"
        ? `impressora=${config.printer.host}:${config.printer.port}`
        : `device=${config.printer.device}`

  log(
    `Print-agent iniciado — API ${config.apiBase} branch=${config.branchId} sector=${config.sector} ${printerInfo} interval=${config.pollIntervalMs}ms`,
  )

  for (;;) {
    try {
      const n = await processPendingJobs(client, config, sink, log)
      if (n > 0) log(`Processados ${n} job(s)`)
    } catch (err) {
      log(`[erro] ${err instanceof Error ? err.message : String(err)}`)
    }
    await new Promise((r) => setTimeout(r, config.pollIntervalMs))
  }
}
