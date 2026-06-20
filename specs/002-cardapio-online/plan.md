# Implementation Plan: 002-cardapio-online

**Date**: 2026-06-20 | **Spec**: [spec.md](./spec.md) | **Onda**: 2

## Summary

Cardápio público por filial com listagem de produtos/categorias, carrinho client-side e checkout que cria pedido via API. UI responsiva com layout `100dvh` no shell OS.

## Technical Context

**Stack**: Next.js 15 (export estático), api-gateway catalog routes, Postgres `products` + `categories`  
**Pacotes**: `apps/web`, `apps/workers/api-gateway/src/routes/catalog.ts`  
**Auth checkout**: JWT opcional no POST `/api/v1/orders` (login exigido na UI)  
**Testing**: vitest web smoke; E2E manual cardápio → pedido

## Arquitetura

```text
Browser /cardapio
  → GET /api/v1/branches/:branchId/catalog/products
  → POST /api/v1/orders (items + branchId)
  → outbox order.created
```

## Constitution Check

| Princípio | Status |
|-----------|--------|
| Multitenant | produtos filtrados por `tenant_id` + `branch_id` |
| Event-first | pedido dispara outbox após checkout |
| TDD | pendente — testes E2E cardápio/checkout |

## Referências

- `apps/web/src/app/(os)/cardapio/page.tsx`
- `apps/workers/api-gateway/src/routes/catalog.ts`
- Seed demo: `packages/database/prisma/seed.ts`
