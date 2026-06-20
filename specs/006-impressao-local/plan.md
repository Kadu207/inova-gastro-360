# Implementation Plan: 006-impressao-local

**Date**: 2026-06-20 | **Spec**: [spec.md](./spec.md) | **Onda**: 3

## Summary

Fila de impressão por setor (balcão/cozinha/A4) disparada na criação do pedido. Hoje: `print_jobs` gravados no Postgres + evento `print.job_requested`. Falta o **print-agent** local que consome a fila e envia para impressoras ESC/POS ou A4.

## Technical Context

**Storage**: tabela `print_jobs` (sector, status, payload JSON)  
**API**: insert em `orders.ts` ao criar pedido (setor `cozinha`)  
**Evento**: `PRINT_JOB_REQUESTED` via outbox  
**Agente local**: **não implementado** — previsto em `apps/print-agent/` (docs)  
**Setores**: cozinha, balcao, a4

## Arquitetura alvo

```text
order.created → print_jobs (pending)
print-agent (LAN) → poll/API → imprime → PATCH status printed
```

## Constitution Check

| Princípio | Status |
|-----------|--------|
| Event-first | print.job_requested na outbox |
| Edge + local | agente fora do Cloudflare (LAN filial) |
| TDD | pendente — agente + status transitions |

## Referências

- `apps/workers/api-gateway/src/routes/orders.ts` (INSERT print_jobs)
- `docs/architecture.md` — print queue
- `Inova-Food-SaaS-...-v1.2.md` — print-agent estrutura
