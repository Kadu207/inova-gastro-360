import * as escpos from "./commands"

export interface PrintJobItem {
  productId?: string
  productName?: string
  quantity?: number
  notes?: string | null
  unitCents?: number
  totalCents?: number
}

export interface PrintJobPayload {
  orderNumber?: number | string
  items?: PrintJobItem[]
  customerName?: string | null
  notes?: string | null
}

const SECTOR_LABELS: Record<string, string> = {
  cozinha: "COZINHA",
  balcao: "BALCAO",
  balcão: "BALCAO",
}

function itemLabel(item: PrintJobItem): string {
  if (item.productName) return item.productName
  if (item.productId) return `Produto ${item.productId.slice(0, 8)}`
  return "Item"
}

export function buildKitchenTicket(payload: PrintJobPayload, sector: string): Buffer {
  const sectorLabel = SECTOR_LABELS[sector.toLowerCase()] ?? sector.toUpperCase()
  const orderNumber = payload.orderNumber ?? "?"
  const items = payload.items ?? []
  const now = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })

  const chunks: Buffer[] = [
    escpos.init(),
    escpos.align("center"),
    escpos.bold(true),
    escpos.textLine("INOVA GASTRO 360"),
    escpos.doubleSize(true),
    escpos.textLine(sectorLabel),
    escpos.doubleSize(false),
    escpos.bold(false),
    escpos.separator("="),
    escpos.align("left"),
    escpos.bold(true),
    escpos.textLine(`Pedido #${orderNumber}`),
    escpos.bold(false),
  ]

  if (payload.customerName) {
    chunks.push(escpos.textLine(`Cliente: ${payload.customerName}`))
  }

  if (payload.notes) {
    chunks.push(escpos.textLine(`Obs pedido: ${payload.notes}`))
  }

  chunks.push(escpos.separator("-"))

  for (const item of items) {
    const qty = item.quantity ?? 1
    chunks.push(escpos.bold(true), escpos.textLine(`${qty}x ${itemLabel(item)}`), escpos.bold(false))
    if (item.notes) {
      chunks.push(escpos.textLine(`   Obs: ${item.notes}`))
    }
  }

  if (!items.length) {
    chunks.push(escpos.textLine("(sem itens no payload)"))
  }

  chunks.push(
    escpos.separator("-"),
    escpos.align("center"),
    escpos.textLine(now),
    escpos.textLine(""),
    escpos.cut(),
  )

  return escpos.concat(chunks)
}

export function parsePrintPayload(raw: Record<string, unknown>): PrintJobPayload {
  const items = Array.isArray(raw.items)
    ? raw.items.map((row) => {
        if (!row || typeof row !== "object") return {}
        const item = row as Record<string, unknown>
        return {
          productId: typeof item.productId === "string" ? item.productId : undefined,
          productName: typeof item.productName === "string" ? item.productName : undefined,
          quantity: typeof item.quantity === "number" ? item.quantity : undefined,
          notes: typeof item.notes === "string" ? item.notes : item.notes === null ? null : undefined,
          unitCents: typeof item.unitCents === "number" ? item.unitCents : undefined,
          totalCents: typeof item.totalCents === "number" ? item.totalCents : undefined,
        }
      })
    : []

  return {
    orderNumber:
      typeof raw.orderNumber === "number" || typeof raw.orderNumber === "string"
        ? raw.orderNumber
        : undefined,
    items,
    customerName: typeof raw.customerName === "string" ? raw.customerName : null,
    notes: typeof raw.notes === "string" ? raw.notes : null,
  }
}
