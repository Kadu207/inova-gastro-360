# Plan: 017 — Asaas Pagamentos

**Date**: 2026-07-31 | **Spec**: [spec.md](./spec.md)

## Summary

Asaas como gateway oficial BR para pedidos (PIX + cartão) e assinatura SaaS. Stripe permanece como `BILLING_PROVIDER=stripe`. Pipeline interno da 007 (apply-order/apply-subscription + payment_events) reutilizado.

## Technical Context

- **API Asaas**: `https://api.asaas.com/api/v3` | sandbox `https://sandbox.asaas.com/api/v3`
- **Auth**: header `access_token`
- **Webhook auth**: header `asaas-access-token` == `ASAAS_WEBHOOK_TOKEN`
- **Workers**: api-gateway (create) + integrations (webhook)

## Constitution Check

| Princípio | Status |
|-----------|--------|
| SDD | specs/017 |
| TDD | order-payments + asaas webhook + billing |
| Multitenant | externalReference `tenantId:orderId` |
| Event-first | outbox `order.payment_confirmed` |
| Simplicity | um adapter `asaas.ts` + flag billing |
