export type PrinterType = "none" | "network" | "file"

export interface PrinterConfig {
  type: PrinterType
  host: string
  port: number
  device: string
  timeoutMs: number
}

export interface PrintAgentConfig {
  apiBase: string
  email: string
  password: string
  tenantSlug: string
  branchId: string
  sector: string
  pollIntervalMs: number
  maxRetries: number
  dryRun: boolean
  printer: PrinterConfig
}

function parsePrinterType(raw: string | undefined): PrinterType {
  const value = (raw ?? "none").toLowerCase()
  if (value === "network" || value === "tcp") return "network"
  if (value === "file" || value === "usb") return "file"
  return "none"
}

export function loadPrinterConfig(env: NodeJS.ProcessEnv = process.env): PrinterConfig {
  const type = parsePrinterType(env.PRINTER_TYPE)
  const host = env.PRINTER_HOST ?? "127.0.0.1"
  const port = Number.parseInt(env.PRINTER_PORT ?? "9100", 10)
  const device = env.PRINTER_DEVICE ?? "/dev/usb/lp0"
  const timeoutMs = Number.parseInt(env.PRINTER_TIMEOUT_MS ?? "5000", 10)

  if (type === "network" && (!Number.isFinite(port) || port < 1 || port > 65535)) {
    throw new Error("PRINTER_PORT inválido (1–65535)")
  }
  if (!Number.isFinite(timeoutMs) || timeoutMs < 500) {
    throw new Error("PRINTER_TIMEOUT_MS inválido (mínimo 500)")
  }

  return { type, host, port, device, timeoutMs }
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): PrintAgentConfig {
  const apiBase = env.PRINT_AGENT_API_BASE ?? "http://127.0.0.1:8792"
  const email = env.PRINT_AGENT_EMAIL ?? "admin@inovagastro360.local"
  const password = env.PRINT_AGENT_PASSWORD ?? ""
  const tenantSlug = env.PRINT_AGENT_TENANT_SLUG ?? "demo-burger"
  const branchId = env.PRINT_AGENT_BRANCH_ID ?? "00000000-0000-4000-8000-000000000002"
  const sector = env.PRINT_AGENT_SECTOR ?? "cozinha"
  const pollIntervalMs = Number.parseInt(env.PRINT_AGENT_POLL_MS ?? "5000", 10)
  const maxRetries = Number.parseInt(env.PRINT_AGENT_MAX_RETRIES ?? "3", 10)
  const dryRun = env.PRINT_AGENT_DRY_RUN === "1" || env.PRINT_AGENT_DRY_RUN === "true"

  if (!Number.isFinite(pollIntervalMs) || pollIntervalMs < 1000) {
    throw new Error("PRINT_AGENT_POLL_MS inválido (mínimo 1000)")
  }
  if (!Number.isFinite(maxRetries) || maxRetries < 1) {
    throw new Error("PRINT_AGENT_MAX_RETRIES inválido (mínimo 1)")
  }
  if (!dryRun && !password) {
    throw new Error("PRINT_AGENT_PASSWORD é obrigatório (defina a variável de ambiente)")
  }

  return {
    apiBase: apiBase.replace(/\/$/, ""),
    email,
    password,
    tenantSlug,
    branchId,
    sector,
    pollIntervalMs,
    maxRetries,
    dryRun,
    printer: loadPrinterConfig(env),
  }
}
