# Go-live pagamentos — Asaas (oficial BR) + Stripe fallback

Infraestrutura **já deployada** em modo dormant (`PAYMENTS_ENABLED=false`). Na venda, basta inserir credenciais **Asaas**.

## 1. Caminho na VPS

```bash
cd ~/inova-gastro-360
ls infra/hetzner/.env.production
```

## 2. Modo dormant

```bash
git pull
bash infra/hetzner/scripts/prepare-payments-vps.sh
```

## 3. Webhooks (não pode 404)

```
https://inovagastro360.inovatitech.com.br/webhooks/asaas
https://inovagastro360.inovatitech.com.br/webhooks/stripe
```

Tunnel → `http://127.0.0.1:9088` (nginx com `location /webhooks/`).

## 4. Ativar Asaas

```bash
export ASAAS_API_KEY='cole-a-api-key'
export ASAAS_WEBHOOK_TOKEN='token-do-webhook'
export ASAAS_SANDBOX=true
export PAYMENTS_SANDBOX=true
# opcional: STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET

bash infra/hetzner/scripts/configure-payments-env-vps.sh

# NÃO passar --env-file no CLI: API Key Asaas começa com `$` e o Compose
# interpreta como variável, zerando a key nos containers.
# O service já usa env_file: .env.production (relativo a infra/hetzner/).
docker compose -f infra/hetzner/docker-compose.app.yml \
  up -d --force-recreate api-gateway integrations

# Conferir se a key chegou no container (só o tamanho; não imprime o segredo)
docker exec inova-gastro-360-api sh -c 'echo "ASAAS_API_KEY len=${#ASAAS_API_KEY}"'

bash infra/hetzner/scripts/smoke-payments-vps.sh
```

Defaults: `ORDER_PAYMENT_PROVIDER=asaas`, `BILLING_PROVIDER=asaas`.
