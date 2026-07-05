# Go-live pagamentos — após venda do produto

Infraestrutura **já deployada** em modo dormant (`PAYMENTS_ENABLED=false`). Na venda, basta inserir credenciais.

---

## 1. Erro comum na VPS — caminho errado

Os scripts assumem que o repositório está clonado em `~/inova-gastro-360`:

```bash
cd ~/inova-gastro-360   # NÃO rode docker compose em ~
ls infra/hetzner/.env.production
```

Se `couldn't find env file: /home/gestaoti/infra/hetzner/.env.production` → você está no diretório errado.

---

## 2. Preparar modo dormant (pré-venda)

```bash
cd ~/inova-gastro-360
git pull
bash infra/hetzner/scripts/prepare-payments-vps.sh
```

Isso define `PAYMENTS_ENABLED=false`, reinicia nginx + workers e testa a rota `/webhooks/`.

---

## 3. Webhook 404 — diagnóstico

| Teste | Comando | Resultado esperado |
|-------|---------|-------------------|
| Local nginx | `curl -s -o /dev/null -w '%{http_code}\n' -X POST http://127.0.0.1:9088/webhooks/mercadopago -H 'content-type: application/json' -d '{}'` | **401** ou **400** (não 404) |
| Público | `curl -s -o /dev/null -w '%{http_code}\n' -X POST https://inovagastro360.inovatitech.com.br/webhooks/mercadopago -H 'content-type: application/json' -d '{}'` | **401** ou **400** |

### Se local OK mas público 404

O **Cloudflare Tunnel** não passa pelo nginx `:9088`. Corrija o ingress:

```yaml
# cloudflared config — hostname principal
- hostname: inovagastro360.inovatitech.com.br
  service: http://127.0.0.1:9088    # nginx (web + /api + /webhooks)
```

**Não use** para webhooks:
- `inovagastro360-api.inovatitech.com.br` → api-gateway `:8792` (sem rota `/webhooks/`)
- `:3102` direto → só web estática (sem proxy)

### URLs corretas nos painéis MP/Stripe

```
https://inovagastro360.inovatitech.com.br/webhooks/mercadopago
https://inovagastro360.inovatitech.com.br/webhooks/stripe
```

---

## 4. Ativar credenciais (pós-venda)

Obtenha os segredos (MP Developers + Stripe Dashboard) e rode:

```bash
cd ~/inova-gastro-360

# Credenciais REAIS — strings completas, sem reticências. O script recusa placeholders.
export MERCADOPAGO_ACCESS_TOKEN='cole-o-token-completo-do-painel-mp'
export MERCADOPAGO_WEBHOOK_SECRET='opcional-assinatura-mp'
export STRIPE_SECRET_KEY='cole-sk_test_ou_sk_live_completo'
export STRIPE_WEBHOOK_SECRET='cole-whsec_completo'
export STRIPE_PRICE_STARTER='cole-price_id_starter'
export STRIPE_PRICE_PRO='cole-price_id_pro'
export PAYMENTS_SANDBOX=true

bash infra/hetzner/scripts/configure-payments-env-vps.sh

docker compose -f infra/hetzner/docker-compose.app.yml \
  --env-file infra/hetzner/.env.production \
  up -d --force-recreate api-gateway integrations

bash infra/hetzner/scripts/build-web-vps.sh
bash infra/hetzner/scripts/smoke-payments-vps.sh
```

Verifique status:

```bash
curl -s https://inovagastro360.inovatitech.com.br/api/v1/payments/status | jq
# enabled: true, mercadoPago: true, stripe: true
```

---

## 5. Reiniciar só o nginx

```bash
cd ~/inova-gastro-360
bash infra/hetzner/scripts/restart-nginx-vps.sh
```
