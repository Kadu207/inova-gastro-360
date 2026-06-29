import type { PrintJobPayload } from "../escpos/ticket";

function brl(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function line(label: string, value: string, width = 48): string {
  const gap = Math.max(1, width - label.length - value.length);
  return `${label}${" ".repeat(gap)}${value}`;
}

/** Comanda A4 simplificada (texto UTF-8 — impressora laser ou arquivo). */
export function buildA4Receipt(payload: PrintJobPayload, sector: string): Buffer {
  const orderNumber = payload.orderNumber ?? "?";
  const items = payload.items ?? [];
  const now = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const width = 48;
  const sep = "=".repeat(width);
  const dash = "-".repeat(width);

  const lines: string[] = [
    "INOVA GASTRO 360".padStart(Math.floor((width + 16) / 2)),
    `COMANDA — ${sector.toUpperCase()}`,
    sep,
    line("Pedido", `#${orderNumber}`, width),
    line("Data", now, width),
  ];

  if (payload.customerName) {
    lines.push(line("Cliente", payload.customerName.slice(0, 24), width));
  }
  if (payload.notes) {
    lines.push(`Obs: ${payload.notes}`);
  }

  lines.push(dash, "ITENS", dash);

  let totalCents = 0;
  for (const item of items) {
    const qty = item.quantity ?? 1;
    const name = item.productName ?? "Item";
    const unit = item.unitCents ?? 0;
    const lineTotal = item.totalCents ?? unit * qty;
    totalCents += lineTotal;
    lines.push(`${qty}x ${name}`);
    if (unit > 0) {
      lines.push(line(`   ${brl(unit)} un.`, brl(lineTotal), width));
    }
    if (item.notes) {
      lines.push(`   Obs: ${item.notes}`);
    }
  }

  if (!items.length) {
    lines.push("(sem itens)");
  }

  lines.push(dash);
  if (totalCents > 0) {
    lines.push(line("TOTAL", brl(totalCents), width));
  }
  lines.push("", "Documento auxiliar — não é documento fiscal.", "", "\f");

  return Buffer.from(lines.join("\n"), "utf8");
}
