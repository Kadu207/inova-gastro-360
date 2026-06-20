# Implementation Plan: 003-pedidos-core

**Date**: 2026-06-20 | **Spec**: [spec.md](./spec.md) | **Onda**: 2

## Summary

Ciclo de vida de pedidos multitenant: criação, listagem, transição de status com histórico, publicação de eventos via outbox. Painéis operacionais (balcão, cozinha, delivery) consomem API + realtime.

## Technical Context

**Storage**: Postgres — `orders`, `order_items`, `order_status_history`, `outbox_events`  
**API**: `apps/workers/api-gateway/src/routes/orders.ts`  
**Eventos**: `@inova-gastro-360/contracts` — `order.created`, `order.status_changed`  
**UI**: `apps/web/src/components/PainelPage.tsx` + rotas `/painel/*`  
**Testing**: TDD pendente — rotas pedidos + cross-tenant (constitution P1)

## Fluxo de status

```text
pending → accepted → preparing → ready → out_for_delivery → delivered
                              ↘ cancelled
```

## Constitution Check

| Princípio | Status |
|-----------|--------|
| Multitenant | `tenant_id` em todas as queries + RLS |
| Event-first | outbox + messaging-bus forward |
| TDD | **gap** — testes orders.ts prioritários |

## Referências

- `packages/database/prisma/schema.prisma` (Order, OrderItem, OrderStatusHistory)
- `memory-bank/activeContext.md` — E2E pedido #1001
