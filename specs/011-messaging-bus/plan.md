# Implementation Plan: 011-messaging-bus

**Date**: 2026-06-20 | **Spec**: [spec.md](./spec.md) | **Onda**: 0 skeleton / 3 produção

## Summary

Barramento de mensagens desacoplado: API grava outbox e publica via Service Binding; messaging-bus roteia para realtime-hub e integrations. **Cloudflare Queues e DLQ adiadas** no plano Free — forward síncrono documentado em `QUEUES-DEFERRED.md`.

## Technical Context

**Worker**: `apps/workers/messaging-bus`  
**Entrada**: POST `/internal/publish` (Service Binding da API)  
**Saídas**: `REALTIME_SERVICE`, `INTEGRATIONS_SERVICE`, `ORDERS_QUEUE` (opcional Paid)  
**Outbox**: `apps/workers/api-gateway/src/lib/outbox.ts`  
**Contratos**: `@inova-gastro-360/contracts` EVENT_TYPES

## Arquitetura (Free vs Paid)

```text
# Atual (Free)
api-gateway → MESSAGING_SERVICE /internal/publish
  → forward síncrono rt + integrations

# Fase 2 (Workers Paid)
api → outbox → ORDERS_QUEUE → consumer → rt + int + DLQ
```

## Constitution Check

| Princípio | Status |
|-----------|--------|
| Event-first | outbox pattern implementado |
| Desacoplamento | API não chama RT/INT diretamente |
| Simplicity | forward sync aceito no Free |

## Referências

- `infra/cloudflare/QUEUES-DEFERRED.md`
- Spec 010 — deploy order integrations → rt → msg → api
