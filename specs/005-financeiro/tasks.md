# Tasks: 005-financeiro (retrospectivo)

## Onda 1–3 (escopo mínimo — entregue)

- [x] T001 `orders.total_cents` persistido na criação do pedido
- [x] T002 Nav Financeiro marcado disabled até Onda 4

## Onda 4 — Caixa e ledger (entregue)

- [x] T010 Schema `cash_sessions` + `ledger_entries` + `payables` + `receivables` com RLS
      (migration `20260731150000_financeiro_005`)
- [x] T011 API abertura/fechamento caixa por filial (`POST /api/v1/finance/cash/open`,
      `POST /api/v1/finance/cash/:id/close`, `GET /api/v1/finance/cash/branch/:branchId`)
- [x] T012 Sangria/suprimento com audit trail (`writeAuditLog`) e um único caixa aberto por filial
- [x] T013 UI dashboard financeiro (`/dashboard/financeiro`) com caixa, DRE, contas e export

## Onda 4 — Contas e relatórios (entregue)

- [x] T020 Contas a pagar/receber CRUD (create/list/get + baixa via
      `POST /api/v1/finance/payables/:id/pay` e `POST /api/v1/finance/receivables/:id/receive`)
- [x] T021 DRE gerencial (agregação de receita paga em `orders` vs. despesas pagas em `payables`)
- [x] T022 Export CSV/JSON do ledger (`GET /api/v1/finance/export?format=csv|json`) —
      PDF/XLSX completos ficam para follow-up (fora do escopo mínimo de Onda 4)
- [x] T023 Testes TDD: abertura/fechamento de caixa, sangria/suprimento, cross-tenant
      (caixa e `internal-payments`), payables/receivables, DRE, export
- [x] T024 Pagamento de pedido confirmado (`internal-payments`) gera receivable já quitado
      + lançamento de venda no ledger (integração pedidos ↔ financeiro)
