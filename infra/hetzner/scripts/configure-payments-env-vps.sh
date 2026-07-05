#!/usr/bin/env bash
# Configura variáveis de pagamento (Mercado Pago + Stripe) em .env.production na VPS.
# Não grava segredos no repositório — valores via argumentos ou prompt.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT/infra/hetzner/.env.production}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Arquivo não encontrado: $ENV_FILE"
  echo "  cp infra/hetzner/.env.production.example infra/hetzner/.env.production"
  exit 1
fi

upsert_env() {
  local key="$1"
  local val="$2"
  if grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
    sed -i.bak "s|^${key}=.*|${key}=${val}|" "$ENV_FILE"
  else
    echo "${key}=${val}" >> "$ENV_FILE"
  fi
}

: "${MERCADOPAGO_ACCESS_TOKEN:?Defina MERCADOPAGO_ACCESS_TOKEN}"
: "${STRIPE_SECRET_KEY:?Defina STRIPE_SECRET_KEY}"
: "${STRIPE_WEBHOOK_SECRET:?Defina STRIPE_WEBHOOK_SECRET}"

upsert_env "MERCADOPAGO_ACCESS_TOKEN" "$MERCADOPAGO_ACCESS_TOKEN"
upsert_env "MERCADOPAGO_WEBHOOK_SECRET" "${MERCADOPAGO_WEBHOOK_SECRET:-}"
upsert_env "STRIPE_SECRET_KEY" "$STRIPE_SECRET_KEY"
upsert_env "STRIPE_WEBHOOK_SECRET" "$STRIPE_WEBHOOK_SECRET"
upsert_env "PAYMENTS_SANDBOX" "${PAYMENTS_SANDBOX:-false}"
upsert_env "PIX_EXPIRATION_MINUTES" "${PIX_EXPIRATION_MINUTES:-30}"
upsert_env "STRIPE_PRICE_STARTER" "${STRIPE_PRICE_STARTER:-price_test_starter}"
upsert_env "STRIPE_PRICE_PRO" "${STRIPE_PRICE_PRO:-price_test_pro}"
upsert_env "STRIPE_PRICE_ENTERPRISE" "${STRIPE_PRICE_ENTERPRISE:-price_test_enterprise}"
upsert_env "PAYMENTS_ENABLED" "true"
upsert_env "PAYMENTS_PUBLIC_BASE_URL" "${PAYMENTS_PUBLIC_BASE_URL:-https://inovagastro360.inovatitech.com.br}"

echo "OK — variáveis de pagamento atualizadas em $ENV_FILE"
echo "PAYMENTS_ENABLED=true — recrie api-gateway + integrations:"
echo "  bash infra/hetzner/scripts/prepare-payments-vps.sh  # só se quiser desligar de novo"
echo "  docker compose -f infra/hetzner/docker-compose.app.yml --env-file infra/hetzner/.env.production up -d --force-recreate api-gateway integrations"
