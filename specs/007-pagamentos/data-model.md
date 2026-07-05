# Data Model: 007 — Pagamentos

**Data**: 2026-07-03

---

## Extensões ao modelo existente

### Order (extensão)

Campos adicionados à tabela `orders`:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `payment_status` | enum string | `unpaid` \| `pending` \| `paid` \| `expired` \| `failed` \| `refunded` |
| `paid_at` | timestamptz? | Momento da confirmação |
| `payment_method` | string? | `pix` \| `card` \| `cash` (futuro) |

**Regra**: `payment_status = paid` só via webhook confirmado (FR-003).

---

## Novas entidades

### payment_intents

Tentativa de cobrança ligada a um pedido (PIX/cartão).

| Campo | Tipo | Constraints |
|-------|------|-------------|
| `id` | uuid PK | |
| `tenant_id` | uuid | RLS |
| `branch_id` | uuid | |
| `order_id` | uuid FK → orders | UNIQUE parcial onde status IN (pending) — uma cobrança ativa |
| `provider` | string | `mercadopago` |
| `method` | string | `pix` \| `card` |
| `amount_cents` | int | MUST = order.total_cents |
| `currency` | string | default `BRL` |
| `status` | string | `created` \| `pending` \| `paid` \| `expired` \| `failed` \| `cancelled` |
| `external_id` | string? | ID no Mercado Pago |
| `external_reference` | string | `{tenantId}:{orderId}` para reconciliação |
| `pix_qr_code` | text? | Base64 ou URL (não logar em produção) |
| `pix_copy_paste` | text? | EMV copia-e-cola |
| `expires_at` | timestamptz? | |
| `metadata` | jsonb | resposta bruta resumida |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

**Índices**: `(tenant_id, order_id)`, `(external_id)`, `(status, expires_at)`.

**Transições**:

```text
created → pending → paid
                 → expired
                 → failed
pending → cancelled (nova tentativa)
```

---

### payment_events

Log idempotente de webhooks.

| Campo | Tipo | Constraints |
|-------|------|-------------|
| `id` | uuid PK | |
| `tenant_id` | uuid? | resolvido após parse |
| `provider` | string | `mercadopago` \| `stripe` |
| `external_event_id` | string | UNIQUE(provider, external_event_id) |
| `event_type` | string | ex. `payment.updated` |
| `payload` | jsonb | corpo normalizado |
| `processed_at` | timestamptz? | |
| `result` | string | `applied` \| `ignored` \| `failed` |
| `error_message` | text? | |
| `created_at` | timestamptz | |

---

### subscription_checkouts

Sessões Stripe para upgrade SaaS.

| Campo | Tipo | Constraints |
|-------|------|-------------|
| `id` | uuid PK | |
| `tenant_id` | uuid | RLS |
| `plan_id` | uuid FK → subscription_plans | |
| `stripe_checkout_session_id` | string UNIQUE | |
| `stripe_customer_id` | string? | |
| `status` | string | `open` \| `complete` \| `expired` |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

---

### subscriptions (extensão spec 015)

Campos adicionados:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `stripe_subscription_id` | string? UNIQUE | |
| `stripe_customer_id` | string? | |
| `grace_period_ends_at` | timestamptz? | Após `invoice.payment_failed` |

**Status values**: `trialing` \| `active` \| `past_due` \| `cancelled` \| `restricted`.

---

### subscription_plans (extensão)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `stripe_price_id` | string? | Mapeamento Stripe Price |

---

### tenant_payment_configs (P2 — multi-tenant MP)

Opcional pós-MVP:

| Campo | Tipo |
|-------|------|
| `tenant_id` | uuid PK |
| `mercadopago_access_token_enc` | text |
| `is_sandbox` | boolean |

MVP usa token global em env.

---

## RLS

- `payment_intents`, `payment_events` (quando `tenant_id` setado), `subscription_checkouts`: policy `tenant_id = current_setting('app.current_tenant_id')::uuid`.
- Webhook handler resolve tenant via `external_reference` ou metadata antes de INSERT com tenant.

---

## Relacionamentos

```text
Order 1 ── * PaymentIntent
PaymentIntent * ── * PaymentEvent (via external_id linkage)
Tenant 1 ── 1 Subscription
Subscription * ── 1 SubscriptionPlan
Tenant 1 ── * SubscriptionCheckout
```
