# Quickstart: 007 — Pagamentos (dev local)

**Pré-requisitos**: spec 015 aplicada, Postgres local, api-gateway + integrations rodando.

---

## 1. Credenciais sandbox

Copie para `apps/workers/api-gateway/.dev.vars` e `apps/workers/integrations/.dev.vars`:

```bash
MERCADOPAGO_ACCESS_TOKEN=TEST-...        # Mercado Pago → Credenciais de teste
MERCADOPAGO_WEBHOOK_SECRET=...           # Assinatura configurada no painel MP
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
PAYMENTS_SANDBOX=true
INTERNAL_SHARED_SECRET=dev-internal-secret
```

**Stripe CLI** (webhooks locais):

```bash
stripe listen --forward-to localhost:8789/webhooks/stripe
```

**Mercado Pago**: ngrok ou Cloudflare Tunnel → `https://<tunnel>/webhooks/mercadopago`

---

## 2. Migration

```bash
cd packages/database
npx prisma migrate dev --name payments_007
npx prisma db seed   # planos com stripe_price_id (após seed update)
```

---

## 3. Fluxo PIX (manual)

1. Criar pedido no cardápio demo (`http://localhost:3000/cardapio`).
2. Anotar `orderId` na resposta ou painel.
3. Iniciar PIX:

```bash
curl -X POST "http://localhost:8787/api/v1/branches/{branchId}/orders/{orderId}/pay" \
  -H "Content-Type: application/json" \
  -d '{"method":"pix"}'
```

4. Pagar no app MP (conta teste) ou simular webhook com fixture.
5. Verificar:

```bash
curl "http://localhost:8787/api/v1/branches/{branchId}/orders/{orderId}/payment"
# paymentStatus: "paid"
```

---

## 4. Fluxo Stripe SaaS

1. Login admin demo.
2. Dashboard → Assinatura → Escolher plano Pro.
3. Concluir checkout Stripe test (`4242 4242 4242 4242`).
4. Verificar DB:

```sql
SELECT status, plan_id, stripe_subscription_id FROM subscriptions WHERE tenant_id = '...';
```

---

## 5. Testes

```bash
npm run test --workspace=@inova/api-gateway -- payments
npm run test --workspace=@inova/integrations -- webhooks
```

Casos críticos (constitution):
- Webhook duplicado → estado inalterado na 2ª vez
- `tenant_id` A não aplica pagamento em pedido de tenant B
- Valor MP ≠ total pedido → `applied: false`

---

## 6. Smokes VPS (pós-deploy)

Documentar em `infra/hetzner/scripts/smoke-payments-vps.sh` (tasks):
- PIX sandbox end-to-end
- Stripe test checkout
- Webhook reachability from public URL
