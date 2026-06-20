# Implementation Plan: 004-realtime-paineis

**Date**: 2026-06-20 | **Spec**: [spec.md](./spec.md) | **Onda**: 3

## Summary

Atualização em tempo real dos painéis operacionais via WebSocket no Durable Object `BranchRealtimeHub`, um stub por `branchId`. Eventos chegam pelo messaging-bus (`/broadcast`).

## Technical Context

**Worker**: `apps/workers/realtime-hub` — DO sqlite (`new_sqlite_classes`)  
**Endpoint**: `GET /ws?branchId=<uuid>` → upgrade WebSocket no DO  
**Prod**: `inovagastro360-rt.inovatitech.com.br`  
**Web client**: `realtimeWsUrl()` em `apps/web/src/lib/api.ts` + fallback polling 15s  
**SLA alvo**: <2s p95 do evento ao refresh do painel

## Arquitetura

```text
api-gateway outbox → messaging-bus /internal/publish
  → realtime-hub POST /broadcast?branchId=
  → BranchRealtimeHub DO → WebSocket clients
```

## Constitution Check

| Princípio | Status |
|-----------|--------|
| Edge-first | DO por filial, sem sticky session no browser |
| Event-first | broadcast após order.status_changed |
| TDD | smoke test health only — falta teste broadcast |

## Referências

- `apps/workers/realtime-hub/src/branch-hub.ts`
- `apps/web/src/components/PainelPage.tsx`
- Spec 010 — deploy RT + DNS
