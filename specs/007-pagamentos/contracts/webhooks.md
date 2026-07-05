# Contract: Webhooks de Pagamento (007)

Webhooks são recebidos pelo worker **`integrations`**, não pelo api-gateway público.

---

## Mercado Pago — POST `/webhooks/mercadopago`

**Auth**: Validação `x-signature` (manifest `id;request-id;ts` + secret).

**Fluxo**:
1. Parse body (`type`, `data.id`, `action`).
2. Buscar pagamento na API MP se necessário (`GET /v1/payments/{id}`).
3. Resolver `tenant_id` + `order_id` via `external_reference` (`{tenantId}:{orderId}`).
4. INSERT `payment_events` — conflito UNIQUE → `200` idempotente.
5. Se `status === approved` e valor confere → `POST /internal/payments/apply-order` no api-gateway.

**Response**: sempre `200` após persistir evento (MP retenta em falha).

**Eventos relevantes**: `payment.created`, `payment.updated`.

---

## Stripe — POST `/webhooks/stripe`

**Auth**: `stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET)`.

| Evento | Ação |
|--------|------|
| `checkout.session.completed` | Ativar assinatura; link `stripe_subscription_id` |
| `customer.subscription.updated` | Sync status/plano |
| `customer.subscription.deleted` | `cancelled` |
| `invoice.payment_failed` | `past_due` + `grace_period_ends_at` |

**Fluxo**: idempotência via `event.id` em `payment_events`.

---

## Internal — POST `/internal/payments/apply-order`

**Auth**: `x-internal-secret` = `INTERNAL_SHARED_SECRET`

**Body**:

```json
{
  "provider": "mercadopago",
  "externalPaymentId": "12345678",
  "orderId": "uuid",
  "tenantId": "uuid",
  "amountCents": 4590,
  "method": "pix",
  "eventId": "mp-evt-unique"
}
```

**Response `200`**: `{ "applied": true, "paymentStatus": "paid" }`  
**Response `200`**: `{ "applied": false, "reason": "already_paid" }` (idempotente)

---

## Internal — POST `/internal/payments/apply-subscription`

**Body**:

```json
{
  "provider": "stripe",
  "eventId": "evt_...",
  "tenantId": "uuid",
  "stripeSubscriptionId": "sub_...",
  "stripeCustomerId": "cus_...",
  "planCode": "pro",
  "status": "active",
  "currentPeriodEnd": "2026-08-03T00:00:00.000Z"
}
```
