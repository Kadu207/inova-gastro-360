# API Contract: Assinatura SaaS (007)

**Base**: `/api/v1/billing`  
**Auth**: JWT — roles `admin_cliente` ou `super_admin` do tenant

---

## GET `/subscription`

Estado atual da assinatura.

**Response `200`**:

```json
{
  "status": "trialing",
  "plan": { "code": "starter", "name": "Starter", "priceCents": 9900 },
  "trialEndsAt": "2026-07-17T00:00:00.000Z",
  "currentPeriodEnd": null,
  "gracePeriodEndsAt": null
}
```

---

## GET `/plans`

Planos ativos (global, sem RLS).

**Response `200`**:

```json
{
  "plans": [
    { "code": "starter", "name": "Starter", "priceCents": 9900, "maxBranches": 1 },
    { "code": "pro", "name": "Pro", "priceCents": 19900, "maxBranches": 3 }
  ]
}
```

---

## POST `/checkout`

Cria Stripe Checkout Session para upgrade.

**Body**:

```json
{
  "planCode": "pro",
  "successUrl": "https://inovagastro360.inovatitech.com.br/dashboard?billing=success",
  "cancelUrl": "https://inovagastro360.inovatitech.com.br/dashboard?billing=cancel"
}
```

**Response `200`**:

```json
{
  "checkoutUrl": "https://checkout.stripe.com/c/pay/cs_test_...",
  "sessionId": "cs_test_..."
}
```

**Errors**:
- `403` — role insuficiente
- `409` — assinatura já ativa no mesmo plano

---

## POST `/portal`

Stripe Customer Portal (gerenciar cartão/cancelar).

**Response `200`**:

```json
{
  "portalUrl": "https://billing.stripe.com/p/session/..."
}
```

---

## Restrições por status

| Status | Comportamento |
|--------|---------------|
| `trialing` | Acesso completo até `trialEndsAt` |
| `active` | Acesso conforme plano |
| `past_due` | Banner + grace 7d; funcionalidades mantidas |
| `restricted` | Leitura only; bloqueio de criação de pedidos/produtos |
| `cancelled` | Até fim do período pago, depois `restricted` |
