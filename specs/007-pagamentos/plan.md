# Plan: 007 — Pagamentos (Mercado Pago + Stripe)

**Branch**: `feat/007-pagamentos` | **Data**: 2026-07-03 | **Spec**: [spec.md](./spec.md)

## Summary

Implementar **dois fluxos P1 em paralelo**: (1) PIX de pedidos delivery via **Mercado Pago** com webhooks idempotentes e eventos outbox; (2) assinatura SaaS via **Stripe Billing** integrada às tabelas `subscription_plans` / `subscriptions` da spec 015. Worker `integrations` recebe webhooks; `api-gateway` persiste estado com RLS. Cartão de pedido (P2) reutiliza MP; TEF/POS (P3) fora do MVP.

---

## Technical Context

| Item | Valor |
|------|-------|
| **Language** | TypeScript (Node 20+, Workers compat) |
| **Dependencies** | Mercado Pago REST API, Stripe SDK, Hono (api-gateway), Vitest |
| **Storage** | PostgreSQL multitenant + RLS (Prisma migrations) |
| **Testing** | Vitest unit + integração webhook/idempotência/cross-tenant |
| **Platform** | VPS Docker (api-gateway, integrations); Cloudflare Workers (fase 2) |
| **Performance** | Webhook → pedido pago em < 2 min (SC-001); checkout SaaS < 5 min (SC-003) |
| **Constraints** | Segredos só em env; sem otimismo no cliente; constitution event-first |
| **Scale** | Dezenas de tenants beta; centenas de PIX/dia por tenant |

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Status | Notas |
|-----------|--------|-------|
| I. SDD | ✅ | Spec 007 aprovada; plan + contracts gerados |
| II. TDD | ✅ | Testes obrigatórios: idempotência webhook, cross-tenant, valor divergente |
| III. Multitenant | ✅ | RLS em `payment_intents`, `subscription_checkouts`; tenant via `external_reference` |
| IV. Event-first | ✅ | `order.payment_confirmed` via outbox após webhook |
| V. Simplicity | ✅ | Dois vendors justificados (MP BR + Stripe SaaS); sem marketplace split v1 |

**Re-check pós-design**: ✅ Nenhuma violação; sem entrada em Complexity Tracking.

---

## Decisões técnicas

| Tema | Decisão | Racional |
|------|---------|----------|
| **PIX pedido** | **Mercado Pago** Payments API | Aprovado pelo fundador; QR + copia-e-cola + webhooks maduros no BR |
| **SaaS recorrente** | **Stripe Billing** | Planos já seedados; Checkout Session + Customer Portal |
| **Ordem checkout** | Pedido criado → `POST /pay` gera PIX | Evita cobrança sem pedido; alinha spec 003 |
| **Webhooks** | Worker `integrations` | Desacopla tráfego externo; valida assinatura antes de internal call |
| **Idempotência** | `payment_events(external_event_id)` UNIQUE | SC-002; MP e Stripe retentam |
| **Confirmação** | Só via webhook (FR-003) | Frontend faz polling leve em `GET /payment` |
| **Cartão pedido P2** | Mercado Pago (mesmo pipeline) | Stripe exclusivo do SaaS — separação contábil clara |
| **Credenciais MVP** | Token MP + Stripe keys em env global | `tenant_payment_configs` documentado para P2 multi-loja |
| **Grace SaaS** | 7 dias `past_due` | Assumption spec; EMB-03 trial estende para inadimplência |
| **Expiração PIX** | 30 min default (configurável) | Alinhado MP `date_of_expiration` |

Ver detalhes em [research.md](./research.md).

---

## Project Structure

### Documentation

```text
specs/007-pagamentos/
├── spec.md
├── plan.md                 # este arquivo
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── order-payments.md
│   ├── saas-billing.md
│   └── webhooks.md
└── tasks.md                # /speckit-tasks (próximo passo)
```

### Source Code

```text
packages/database/prisma/
├── schema.prisma           # payment_intents, payment_events, extensions
└── migrations/

apps/workers/api-gateway/src/
├── routes/
│   ├── order-payments.ts   # POST /pay, GET /payment
│   ├── billing.ts          # checkout, portal, subscription
│   └── internal-payments.ts
├── lib/
│   ├── mercadopago.ts      # criar PIX, validar valor
│   └── stripe-billing.ts   # checkout session, portal

apps/workers/integrations/src/
├── webhooks/
│   ├── mercadopago.ts
│   └── stripe.ts
└── lib/signature.ts

apps/web/src/
├── app/(os)/cardapio/      # tela PIX QR + polling
└── app/(os)/dashboard/     # billing upgrade UI
```

**Structure Decision**: Monorepo existente; pagamentos split entre api-gateway (API + persistência) e integrations (webhooks).

---

## Fases de implementação

### Fase A — Fundação (bloqueia tudo)

1. Migration Prisma: `payment_intents`, `payment_events`, extensões `orders`, `subscriptions`, `subscription_plans.stripe_price_id`
2. RLS policies + testes cross-tenant
3. Env vars documentadas (`.dev.vars.example`, VPS docs)

### Fase B — PIX pedido (P1)

1. `POST /orders/{id}/pay` → Mercado Pago create payment (pix)
2. UI cardápio: QR + copia-e-cola + countdown expiração
3. Webhook MP → apply-order → outbox `order.payment_confirmed`
4. Painéis: badge `payment_status`
5. Testes: idempotência, valor errado, expiração

### Fase C — Stripe SaaS (P1)

1. Seed `stripe_price_id` nos planos
2. `POST /billing/checkout` + página dashboard upgrade
3. Webhook Stripe → sync `subscriptions`
4. Grace period + hook EMB inadimplência (extensão EMB-03)
5. Testes: trial → active, payment_failed → past_due

### Fase D — Cartão pedido (P2)

1. Extender `POST /pay` method `card` (Checkout Pro ou token MP)
2. Mesmo webhook pipeline

### Fase E — Hardening

1. Smokes VPS: PIX sandbox + Stripe test mode
2. Observabilidade: logs estruturados `payment_intent_id`, `external_event_id`
3. Runbook webhook retry / DLQ manual

---

## Riscos

| Risco | Mitigação |
|-------|-----------|
| Webhook antes do pedido existir | Persistir evento `pending_resolution`; retry ou DLQ |
| Valor pago ≠ total | Rejeitar apply; alerta operador; não marcar pago |
| Token MP único no MVP | Documentar limitação; roadmap `tenant_payment_configs` |
| Stripe/MP sandbox diverge prod | `PAYMENTS_SANDBOX` + smokes separados |
| RLS quebra queries pagamento | `withTenant` em todos handlers; testes integração |

---

## Dependências

- **003-pedidos**: criação guest, status operacional
- **015-security-hardening**: RLS, subscriptions, outbox, INTERNAL_SHARED_SECRET
- **002-cardapio**: checkout web
- Contas: Mercado Pago Developers + Stripe Dashboard (test keys)

---

## Próximo comando

`/speckit-tasks` — quebrar Fases A–E em tasks TDD ordenadas.
