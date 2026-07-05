# Tasks: 007 — Pagamentos (Mercado Pago + Stripe)

**Input**: `specs/007-pagamentos/` (spec.md, plan.md, research.md, data-model.md, contracts/)  
**Branch sugerida**: `feat/007-pagamentos`  
**Prerequisites**: spec 015 em produção (RLS, subscriptions, outbox, INTERNAL_SHARED_SECRET)

**Tests**: TDD obrigatório (constitution II — pagamentos). Escrever testes antes da implementação; red-green-refactor.

**Organization**: Fases por user story — US1 (PIX P1) e US2 (Stripe SaaS P1) podem avançar em paralelo após a fundação.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Dependências, env vars e estrutura de arquivos vazia

- [x] T001 Adicionar variáveis de pagamento em `apps/workers/api-gateway/src/types/env.ts` (`MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PAYMENTS_SANDBOX`, `PIX_EXPIRATION_MINUTES`)
- [x] T002 [P] Documentar envs em `apps/workers/api-gateway/.dev.vars.example` e `apps/workers/integrations/.dev.vars.example`
- [x] T003 [P] Adicionar `stripe` como dependência em `apps/workers/api-gateway/package.json` (SDK oficial)
- [x] T004 [P] Criar stubs de módulo em `apps/workers/api-gateway/src/lib/mercadopago.ts` e `apps/workers/api-gateway/src/lib/stripe-billing.ts` (exports tipados, sem lógica)
- [x] T005 [P] Criar estrutura `apps/workers/integrations/src/webhooks/` e `apps/workers/integrations/src/lib/signature.ts`
- [x] T006 [P] Adicionar fixtures anonimizadas em `apps/workers/integrations/src/__fixtures__/mercadopago-payment-approved.json` e `stripe-checkout-completed.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema, RLS e rotas internas — **bloqueia US1 e US2**

**⚠️ CRITICAL**: Nenhuma user story começa antes desta fase

- [x] T007 Estender `Order` em `packages/database/prisma/schema.prisma` com `paymentStatus`, `paymentMethod`, `paidAt` (defaults: `unpaid`)
- [x] T008 Adicionar modelos `PaymentIntent` e `PaymentEvent` em `packages/database/prisma/schema.prisma` conforme `data-model.md`
- [x] T009 Adicionar modelos `SubscriptionCheckout` e campos `stripePriceId` / `stripeSubscriptionId` / `stripeCustomerId` / `gracePeriodEndsAt` em `packages/database/prisma/schema.prisma`
- [x] T010 Gerar migration `packages/database/prisma/migrations/*_payments_007/migration.sql` (tabelas + índices + UNIQUE idempotência)
- [x] T011 Estender `packages/database/prisma/migrations/*_security_rls_billing/` ou nova migration SQL com RLS em `payment_intents`, `payment_events`, `subscription_checkouts`
- [x] T012 Atualizar `packages/database/prisma/seed.ts` com `stripePriceId` placeholder nos planos starter/pro/enterprise (env `STRIPE_PRICE_*` ou valores test documentados)
- [x] T013 Implementar `applyOrderPayment` em `apps/workers/api-gateway/src/routes/internal-payments.ts` (`POST /internal/payments/apply-order`) com validação valor + idempotência + outbox `order.payment_confirmed`
- [x] T014 [P] Implementar `applySubscriptionPayment` em `apps/workers/api-gateway/src/routes/internal-payments.ts` (`POST /internal/payments/apply-subscription`) sync `subscriptions`
- [x] T015 Registrar rotas internas e wiring em `apps/workers/api-gateway/src/index.ts` e `apps/workers/api-gateway/src/node-server.ts` (auth `x-internal-secret`)
- [x] T016 [P] Testes fundação: idempotência apply-order em `apps/workers/api-gateway/src/routes/internal-payments.test.ts`
- [x] T017 [P] Teste cross-tenant: pagamento de tenant A não altera pedido de tenant B em `apps/workers/api-gateway/src/routes/internal-payments.test.ts`

**Checkpoint**: Schema migrado, rotas internas testadas — US1 e US2 liberadas

---

## Phase 3: User Story 1 — PIX pedido delivery (Priority: P1) 🎯 MVP parcial

**Goal**: Cliente paga pedido via PIX Mercado Pago; webhook confirma; painéis refletem status

**Independent Test**: Pedido guest no cardápio → `POST /pay` → simular webhook MP approved → pedido `paymentStatus=paid` + evento outbox

### Tests for User Story 1 (TDD — escrever primeiro)

- [x] T018 [P] [US1] Teste contrato `POST .../orders/{id}/pay` em `apps/workers/api-gateway/src/routes/order-payments.test.ts` (201 + QR + copyPaste)
- [x] T019 [P] [US1] Teste webhook MP duplicado idempotente em `apps/workers/integrations/src/webhooks/mercadopago.test.ts`
- [x] T020 [P] [US1] Teste valor divergente rejeitado em `apps/workers/api-gateway/src/routes/internal-payments.test.ts`
- [x] T021 [P] [US1] Teste expiração PIX (`expires_at` passado) em `apps/workers/api-gateway/src/routes/order-payments.test.ts`

### Implementation for User Story 1

- [x] T022 [US1] Implementar cliente MP PIX em `apps/workers/api-gateway/src/lib/mercadopago.ts` (`createPixPayment`, `external_reference` `{tenantId}:{orderId}`)
- [x] T023 [US1] Criar `apps/workers/api-gateway/src/routes/order-payments.ts` — `POST /api/v1/branches/{branchId}/orders/{orderId}/pay` e `GET .../payment`
- [x] T024 [US1] Integrar rotas em `apps/workers/api-gateway/src/index.ts` e `node-server.ts` (withTenant + validação telefone guest FR edge case)
- [x] T025 [US1] Implementar validação assinatura MP em `apps/workers/integrations/src/lib/signature.ts` (`verifyMercadoPagoSignature`)
- [x] T026 [US1] Implementar handler em `apps/workers/integrations/src/webhooks/mercadopago.ts` — persist `payment_events`, chamar apply-order
- [x] T027 [US1] Registrar `POST /webhooks/mercadopago` em `apps/workers/integrations/src/index.ts` e `node-server.ts`
- [x] T028 [US1] Job/cron expiração: marcar intent `expired` + `order.payment_expired` outbox em `apps/workers/api-gateway/src/lib/payment-expiry.ts` (hook no node-server cron existente)
- [x] T029 [P] [US1] UI PIX em `apps/web/src/app/(os)/cardapio/page.tsx` — QR, copia-e-cola, countdown, polling `GET /payment`
- [x] T030 [P] [US1] Expor helpers API em `apps/web/src/lib/api.ts` (`createOrderPayment`, `getOrderPaymentStatus`)
- [x] T031 [P] [US1] Badge `paymentStatus` nos painéis em `apps/web/src/app/(os)/painel/delivery/page.tsx` e `apps/web/src/app/(os)/painel/balcao/page.tsx`
- [x] T032 [US1] Estender resposta GET pedidos em `apps/workers/api-gateway/src/routes/orders.ts` com campos de pagamento (FR-010)

**Checkpoint**: Fluxo PIX sandbox end-to-end funcional e testável isoladamente

---

## Phase 4: User Story 2 — Assinatura SaaS Stripe (Priority: P1)

**Goal**: Admin faz upgrade trial → plano pago via Stripe Checkout; webhooks sync subscriptions; grace period

**Independent Test**: Tenant trial → `POST /billing/checkout` → Stripe test card → webhook → `subscriptions.status=active`

### Tests for User Story 2 (TDD — escrever primeiro)

- [x] T033 [P] [US2] Teste checkout session em `apps/workers/api-gateway/src/routes/billing.test.ts` (200 + checkoutUrl)
- [x] T034 [P] [US2] Teste RBAC: role sem permissão → 403 em `apps/workers/api-gateway/src/routes/billing.test.ts`
- [x] T035 [P] [US2] Teste webhook Stripe idempotente em `apps/workers/integrations/src/webhooks/stripe.test.ts`
- [x] T036 [P] [US2] Teste `invoice.payment_failed` → `past_due` + grace 7d em `apps/workers/api-gateway/src/routes/internal-payments.test.ts`

### Implementation for User Story 2

- [x] T037 [US2] Implementar Stripe Billing em `apps/workers/api-gateway/src/lib/stripe-billing.ts` (`createCheckoutSession`, `createPortalSession`, `constructWebhookEvent`)
- [x] T038 [US2] Criar `apps/workers/api-gateway/src/routes/billing.ts` — `GET /subscription`, `GET /plans`, `POST /checkout`, `POST /portal` conforme `contracts/saas-billing.md`
- [x] T039 [US2] Registrar rotas billing em `apps/workers/api-gateway/src/index.ts` e `node-server.ts` (`requireRole` admin_cliente/super_admin)
- [x] T040 [US2] Implementar handler em `apps/workers/integrations/src/webhooks/stripe.ts` (checkout.session.completed, subscription.updated/deleted, invoice.payment_failed)
- [x] T041 [US2] Registrar `POST /webhooks/stripe` em `apps/workers/integrations/src/index.ts` e `node-server.ts`
- [x] T042 [US2] Middleware restrição por status assinatura em `apps/workers/api-gateway/src/middleware/subscription-guard.ts` (bloqueio `restricted` em writes críticos)
- [x] T043 [US2] Estender EMB-03 em `apps/workers/api-gateway/src/lib/agents.ts` para alertar `past_due` além de trial expirando
- [x] T044 [P] [US2] UI billing em `apps/web/src/app/(os)/dashboard/billing/page.tsx` — planos, upgrade, banner trial/past_due
- [x] T045 [P] [US2] Helpers API billing em `apps/web/src/lib/api.ts` e link no layout dashboard

**Checkpoint**: Upgrade SaaS sandbox funcional independente do PIX

---

## Phase 5: User Story 3 — Cartão no pedido (Priority: P2)

**Goal**: Cliente paga pedido com cartão via Mercado Pago reutilizando pipeline de webhooks

**Independent Test**: Pedido + `POST /pay` method `card` sandbox → webhook approved → pedido pago

### Tests for User Story 3 (TDD)

- [x] T046 [P] [US3] Teste `POST /pay` method `card` em `apps/workers/api-gateway/src/routes/order-payments.test.ts`
- [x] T047 [P] [US3] Teste cartão recusado → `failed` sem duplicar intent em `apps/workers/api-gateway/src/routes/order-payments.test.ts`

### Implementation for User Story 3

- [x] T048 [US3] Estender `apps/workers/api-gateway/src/lib/mercadopago.ts` com fluxo cartão (Checkout Pro ou token MP)
- [x] T049 [US3] Estender `POST /pay` em `apps/workers/api-gateway/src/routes/order-payments.ts` para `method: "card"`
- [x] T050 [P] [US3] UI seleção PIX/cartão no checkout em `apps/web/src/app/(os)/cardapio/page.tsx`
- [x] T051 [US3] Reutilizar webhook MP existente para status cartão em `apps/workers/integrations/src/webhooks/mercadopago.ts`

**Checkpoint**: PIX + cartão pedido + SaaS Stripe operacionais

---

## Phase 6: User Story 4 — TEF/POS presencial (Priority: P3 — backlog)

**Goal**: Fora do MVP v1; apenas documentar stub

**Independent Test**: Manual com terminal homologado (futuro)

- [x] T052 [US4] Documentar escopo P3 e dependências em `specs/007-pagamentos/research.md` (seção TEF/POS — sem implementação v1)
- [x] T053 [US4] Stub endpoint `POST /api/v1/branches/{branchId}/orders/{orderId}/pay-in-person` retornando 501 em `apps/workers/api-gateway/src/routes/order-payments.ts`

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Smokes VPS, docs, observabilidade, validação quickstart

- [x] T054 [P] Script `infra/hetzner/scripts/configure-payments-env-vps.sh` (MP + Stripe secrets, sem valores no repo)
- [x] T055 [P] Script smoke `infra/hetzner/scripts/smoke-payments-vps.sh` (PIX sandbox + Stripe test checkout)
- [x] T056 Logs estruturados com `payment_intent_id` e `external_event_id` em `apps/workers/api-gateway/src/routes/order-payments.ts` e `apps/workers/integrations/src/webhooks/mercadopago.ts`
- [x] T057 [P] Runbook webhook retry/DLQ em `docs/runbooks/payments-webhooks.md`
- [x] T058 Atualizar `infra/hetzner/README.md` e `.env.production.example` com vars de pagamento
- [x] T059 [P] Atualizar `memory-bank/activeContext.md` e `memory-bank/progress.md` pós-implementação
- [x] T060 Validar fluxos de `specs/007-pagamentos/quickstart.md` localmente e marcar checklist em `specs/007-pagamentos/checklists/requirements.md`
- [x] T061 `npm run test` monorepo verde antes de merge PR

---

## Dependencies & Execution Order

### Phase Dependencies

```text
Phase 1 (Setup)
    ↓
Phase 2 (Foundational) — BLOCKS ALL
    ↓
    ├── Phase 3 (US1 PIX P1) ──┐
    └── Phase 4 (US2 Stripe P1) ──┤ paralelo após T017
                                  ↓
                          Phase 5 (US3 Card P2) — depende US1 webhook pipeline
                                  ↓
                          Phase 6 (US4 P3 backlog)
                                  ↓
                          Phase 7 (Polish)
```

### User Story Dependencies

| Story | Depende de | Independente de |
|-------|------------|-----------------|
| US1 PIX | Phase 2 | US2 (webhooks MP ≠ Stripe) |
| US2 Stripe | Phase 2 | US1 |
| US3 Cartão | US1 (mesmo MP pipeline) | US2 |
| US4 TEF | — | Fora v1 |

### Within Each Story

1. Testes (T018–T021, T033–T036, T046–T047) — **red first**
2. Lib/serviço provedor
3. Rotas API / webhooks
4. UI web
5. Checkpoint antes da próxima story

---

## Parallel Example: US1 + US2 após fundação

```bash
# Developer A — US1 PIX
T018–T021 tests → T022 mercadopago.ts → T023 order-payments.ts → T025–T027 integrations webhook

# Developer B — US2 Stripe (simultâneo)
T033–T036 tests → T037 stripe-billing.ts → T038 billing.ts → T040–T041 stripe webhook

# Developer C — Web (após rotas estáveis)
T029 cardapio PIX UI | T044 dashboard billing UI
```

---

## Parallel Example: User Story 1 tests

```bash
# Todos em paralelo (arquivos diferentes):
T018 order-payments.test.ts
T019 mercadopago.test.ts
T020 internal-payments.test.ts (valor divergente)
T021 order-payments.test.ts (expiração)
```

---

## Implementation Strategy

### MVP First (US1 PIX only)

1. Phase 1 + Phase 2 (obrigatório)
2. Phase 3 completa (US1)
3. **STOP & VALIDATE**: quickstart PIX sandbox + smokes
4. Demo comercial parcial (delivery pago online)

### MVP Comercial (US1 + US2)

1. Setup + Foundational
2. US1 + US2 em paralelo
3. Phase 7 smokes VPS
4. Beta comercial (PIX + assinatura)

### Incremental

| Incremento | Entrega |
|------------|---------|
| +US2 | Monetização SaaS |
| +US3 | Cartão delivery |
| +US4 | Loja física TEF (spec futura) |

---

## Summary

| Métrica | Valor |
|---------|-------|
| **Total tasks** | 61 |
| **Setup** | 6 |
| **Foundational** | 11 |
| **US1 PIX (P1)** | 15 (4 testes + 11 impl) |
| **US2 Stripe (P1)** | 13 (4 testes + 9 impl) |
| **US3 Cartão (P2)** | 6 |
| **US4 TEF (P3)** | 2 (backlog) |
| **Polish** | 8 |
| **Parallel [P] tasks** | 28 |
| **MVP sugerido** | Phase 1–3 (T001–T032) |
| **MVP comercial** | Phase 1–4 + T054–T061 |

### Independent Test Criteria

| Story | Critério |
|-------|----------|
| US1 | Pedido guest → PIX → webhook → paid + outbox |
| US2 | Trial → Stripe checkout → active subscription |
| US3 | Pedido → cartão sandbox → paid |
| US4 | Documentado; 501 stub |

---

## Notes

- Branch `feat/007-pagamentos` antes de `/speckit-implement`
- Nunca commitar `MERCADOPAGO_ACCESS_TOKEN`, `STRIPE_SECRET_KEY` ou webhook secrets
- Confirmar `PORT_REGISTRY.md` para novos binds (integrations webhook URL pública)
- US4 não bloqueia release v1 online
