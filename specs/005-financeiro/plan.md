# Implementation Plan: 005-financeiro

**Date**: 2026-06-20 | **Spec**: [spec.md](./spec.md) | **Onda**: 4 (Deferred)

## Summary

Módulo financeiro completo adiado para **Onda 4** por decisão do usuário (2026-06-14). Ondas 1–3 registram apenas `total_cents` e status de pagamento básico no pedido — sem caixa, DRE ou contas a pagar.

## Escopo Onda 4 (futuro)

- Caixa por filial (abertura/fechamento/sangria/suprimento)
- Contas a pagar/receber
- DRE gerencial + dashboard
- Export PDF/CSV/XLSX

## Technical Context (planejado)

**Storage**: novas tabelas `cash_sessions`, `ledger_entries`, `payables`, `receivables`  
**API**: rotas `/api/v1/finance/*` no api-gateway  
**UI**: nav item Financeiro (hoje `disabled: true` em `nav.ts`)  
**Multitenant**: RLS em todas as entidades financeiras

## Estado atual (Onda 1–3)

```text
orders.total_cents — valor do pedido
(pagamento online — spec 007, também Onda 4)
```

## Constitution Check

| Princípio | Status |
|-----------|--------|
| Simplicity | deferido — evita scope creep antes de pedidos estáveis |
| Multitenant | obrigatório no design Onda 4 |
| TDD | exigido em movimentações de caixa e conciliação |

## Gate para iniciar

Autorização explícita do usuário + spec 003 TDD verde + plano aprovado.

## Referências

- `specs/007-pagamentos` — checkout online relacionado
- `apps/web/src/lib/nav.ts` — Financeiro disabled
