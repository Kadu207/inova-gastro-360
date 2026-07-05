# Runbook — Webhooks de pagamento (spec 007)

## Endpoints públicos

| Provedor | URL | Worker |
|----------|-----|--------|
| Mercado Pago | `POST https://inovagastro360.inovatitech.com.br/webhooks/mercadopago` | integrations (:8791) via nginx :9088 |
| Stripe | `POST https://inovagastro360.inovatitech.com.br/webhooks/stripe` | integrations (:8791) via nginx :9088 |

**Não** cadastre webhooks em `inovagastro360-api.inovatitech.com.br` — esse host aponta só para api-gateway.

Via nginx Docker (`location /webhooks/` → `integrations:8791`). Tunnel Cloudflare deve apontar `inovagastro360.inovatitech.com.br` → `http://127.0.0.1:9088`.

Modo pré-venda: `bash infra/hetzner/scripts/prepare-payments-vps.sh` (`PAYMENTS_ENABLED=false`).  
Go-live: `docs/runbooks/payments-go-live.md`

## Fluxo MP

1. MP envia notificação → integrations valida `x-signature`
2. integrations busca pagamento na API MP
3. `POST /internal/payments/apply-order` no api-gateway
4. Idempotência: `payment_events(provider, external_event_id)`

## Fluxo Stripe

1. Stripe envia evento → `constructEvent` com `STRIPE_WEBHOOK_SECRET`
2. Eventos: `checkout.session.completed`, `customer.subscription.*`, `invoice.payment_failed`
3. `POST /internal/payments/apply-subscription` no api-gateway

## Retry / DLQ manual

- MP e Stripe retentam automaticamente em non-2xx
- Sempre retornar **200** após persistir/registrar evento
- Eventos falhos ficam em `payment_events.result = 'failed'` — reprocessar via script SQL + chamada manual apply-order com novo `externalEventId` apenas se necessário

## Logs

Buscar: `mercadopago_webhook_apply`, `stripe_webhook_processed`, `payment_intent_created`

Campos: `payment_intent_id`, `external_event_id`, `external_payment_id`

## Sandbox

- `PAYMENTS_SANDBOX=true` + credenciais TEST do MP
- Stripe `sk_test_` + `stripe listen --forward-to localhost:8791/webhooks/stripe`
