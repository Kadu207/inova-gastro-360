# Feature Specification: 017 — Asaas Pagamentos (BR)

**Feature Branch**: `feat/017-asaas-pagamentos`  
**Status**: In Progress  
**Product**: Inova Gastro 360  
**Input**: Substituir Mercado Pago como gateway oficial de pedidos (PIX + cartão) por Asaas; Assinatura SaaS BR via Asaas; Stripe permanece como fallback/internacional.

## User Story 1 — PIX pedido via Asaas (P1)

Cliente paga pedido delivery com PIX Asaas; webhook confirma; painéis refletem pago.

### Acceptance
1. Given pedido válido, When cliente escolhe PIX, Then recebe QR/copia-e-cola Asaas com expiração.
2. Given webhook `PAYMENT_RECEIVED`/`PAYMENT_CONFIRMED` assinado, Then pedido marcado pago idempotente.
3. Given provider oficial, When cria intent, Then `payment_intents.provider = asaas` (não mercadopago).

## User Story 2 — Cartão pedido via Asaas (P1)

Cliente paga com cartão (checkout/link Asaas); webhook confirma.

## User Story 3 — Assinatura SaaS Asaas (P1)

Admin faz upgrade trial → plano pago via Asaas; `BILLING_PROVIDER=asaas` (default). Stripe via `BILLING_PROVIDER=stripe`.

## User Story 4 — Fallback Stripe (P2)

Tenant/internacional com `BILLING_PROVIDER=stripe` continua usando fluxo 007 existente.

## Requirements
- **FR-001**: `ORDER_PAYMENT_PROVIDER=asaas` (default) cria cobranças só via Asaas.
- **FR-002**: Webhook `POST /webhooks/asaas` com token `asaas-access-token`.
- **FR-003**: Reutilizar `apply-order` / `apply-subscription` internos.
- **FR-004**: Multitenant + RLS; zero vazamento cross-tenant.
- **FR-005**: MP deixa de ser fluxo oficial (código legado opcional para rollback).

## Success Criteria
- SC-001: Testes TDD PIX/cartão/webhook Asaas verdes.
- SC-002: Smoke VPS webhook Asaas ≠ 404 com credencial sandbox.
