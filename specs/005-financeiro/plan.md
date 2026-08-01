# Implementation Plan: 005-financeiro

**Date**: 2026-06-20 | **Atualizado**: 2026-07-31 | **Spec**: [spec.md](./spec.md) | **Onda**: 4 (Em entrega)

## Summary

Módulo financeiro completo da Onda 4 implementado: caixa por filial, ledger de movimentações,
contas a pagar/receber, DRE gerencial e export do ledger. Pagamento de pedido confirmado
(`spec 007 — Asaas/MP`) agora gera automaticamente uma conta a receber quitada e um lançamento
de venda no ledger, integrando pedidos ↔ financeiro.

## Escopo Onda 4 (entregue)

- Caixa por filial (abertura/fechamento/sangria/suprimento) — um único caixa aberto por filial
- Contas a pagar/receber (create/list/get + baixa)
- DRE gerencial (receita paga em pedidos vs. despesas pagas) + dashboard
- Export CSV/JSON do ledger — PDF/XLSX completos são follow-up

## Technical Context

**Storage**: tabelas `cash_sessions`, `ledger_entries`, `payables`, `receivables`
(migration `packages/database/prisma/migrations/20260731150000_financeiro_005`), todas com RLS
via `app_current_tenant_id()`.
**API**: rotas `/api/v1/finance/*` no api-gateway (`apps/workers/api-gateway/src/routes/finance.ts`),
protegidas por `requireAuth` + papéis `admin_cliente`/`super_admin`/`gerente`.
**Integração**: `internal-payments.ts` grava receivable + ledger_entry ao confirmar pagamento de pedido.
**UI**: `apps/web/src/app/(os)/dashboard/financeiro/page.tsx`, nav item Financeiro habilitado em `nav.ts`.
**Multitenant**: RLS em todas as entidades financeiras + filtro explícito por `tenant_id` nas queries
(defesa em profundidade, mesmo padrão de `orders.ts`).

## Estado anterior (Onda 1–3)

```text
orders.total_cents — valor do pedido
(pagamento online — spec 007, integrado nesta Onda 4)
```

## Constitution Check

| Princípio | Status |
|-----------|--------|
| Simplicity | atendido — reaproveita padrões de `orders`/`catalog-admin` (RLS + filtro explícito) |
| Multitenant | RLS habilitado em `cash_sessions`, `ledger_entries`, `payables`, `receivables` |
| TDD | testes de abertura/fechamento de caixa, sangria/suprimento, cross-tenant, payables/receivables, DRE e export em `finance.test.ts` e `internal-payments.test.ts` |

## Follow-ups (fora do escopo mínimo desta entrega)

- Export em PDF/XLSX nativos (hoje CSV/JSON)
- Histórico de sessões de caixa encerradas (detalhe + auditoria de diferença de caixa)
- DRE por categoria/centro de custo (hoje agregado simples receita vs. despesa)

## Referências

- `specs/007-pagamentos` — checkout online relacionado (fonte da conciliação automática)
- `apps/web/src/lib/nav.ts` — Financeiro habilitado
