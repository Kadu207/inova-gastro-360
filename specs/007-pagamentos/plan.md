# Implementation Plan: 007-pagamentos

**Date**: 2026-06-20 | **Spec**: [spec.md](./spec.md) | **Onda**: 4

## Summary

Pagamentos online no checkout web (MVP) com webhooks idempotentes e, em fase 2, integração TEF/POS com provedor (Stone/PagBank/etc). **Não iniciado** — depende de spec 002 checkout estável e decisão de gateway.

## Technical Context (planejado)

**Gateway candidatos**: Stripe, Mercado Pago, PagSeguro (avaliar taxas BR)  
**Worker**: rotas webhook no `integrations` ou submódulo `api-gateway`  
**Storage**: `payment_intents`, `webhook_events` (idempotency_key)  
**UI**: fluxo pós-checkout em `/cardapio` ou página `/pagamento`  
**TEF/POS**: agente local ou SDK terminal — homologação P2

## Fluxo MVP

```text
checkout → create payment intent → redirect/SDK
webhook → verify signature → update order.payment_status
outbox payment.confirmed
```

## Constitution Check

| Princípio | Status |
|-----------|--------|
| Segurança | sem segredos no repo; webhook signature obrigatória |
| Event-first | payment.confirmed via outbox |
| TDD | idempotência webhook + cross-tenant |

## Dependências

- Spec 003 pedidos estável + testes TDD
- Spec 005 financeiro (conciliação) — overlap Onda 4

## Referências

- `apps/workers/integrations` — padrão forward webhooks
- `packages/config/src/index.ts` — ONDA_4 includes pagamentos
