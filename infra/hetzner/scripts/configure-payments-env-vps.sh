#!/usr/bin/env bash
# Configura variáveis de pagamento (Asaas oficial BR + Stripe fallback) em .env.production.
# Não grava segredos no repositório — valores via env.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT/infra/hetzner/.env.production}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Arquivo não encontrado: $ENV_FILE"
  exit 1
fi

fail() { echo "ERRO: $*" >&2; exit 1; }

fail_placeholder() {
  local name="$1"
  local value="$2"
  local preview="${value:0:24}"
  [[ ${#value} -gt 24 ]] && preview="${preview}…"
  fail "${name} parece placeholder (\"${preview}\"). Use credenciais reais do painel Asaas/Stripe."
}

is_obvious_placeholder() {
  local value="$1"
  local v="${value// /}"
  [[ -z "$v" ]] && return 0
  [[ "$v" == *"..."* ]] && return 0
  [[ "$v" =~ ^(CHANGE_ME|your-|price_test_|price_CHANGE_ME|sk_test_CHANGE_ME|whsec_CHANGE_ME) ]] && return 0
  [[ "$v" =~ ^(sua-assinatura|example|placeholder|dummy|fake|todo) ]] && return 0
  return 1
}

assert_not_placeholder() {
  local name="$1"
  local value="$2"
  if is_obvious_placeholder "$value"; then
    fail_placeholder "$name" "$value"
  fi
}

validate_asaas_key() {
  local v="$1"
  assert_not_placeholder "ASAAS_API_KEY" "$v"
  [[ ${#v} -ge 20 ]] || fail "ASAAS_API_KEY curto demais (${#v} caracteres)"
}

validate_stripe_key() {
  local v="$1"
  assert_not_placeholder "STRIPE_SECRET_KEY" "$v"
  [[ "$v" =~ ^sk_(test|live)_ ]] || fail "STRIPE_SECRET_KEY deve começar com sk_test_ ou sk_live_"
  [[ ${#v} -ge 32 ]] || fail "STRIPE_SECRET_KEY curto demais (${#v} caracteres)"
}

validate_stripe_webhook_secret() {
  local v="$1"
  assert_not_placeholder "STRIPE_WEBHOOK_SECRET" "$v"
  [[ "$v" =~ ^whsec_ ]] || fail "STRIPE_WEBHOOK_SECRET deve começar com whsec_"
  [[ ${#v} -ge 20 ]] || fail "STRIPE_WEBHOOK_SECRET curto demais (${#v} caracteres)"
}

upsert_env() {
  local key="$1"
  local val="$2"
  if grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
    sed -i.bak "s|^${key}=.*|${key}=${val}|" "$ENV_FILE"
  else
    echo "${key}=${val}" >> "$ENV_FILE"
  fi
}

: "${ASAAS_API_KEY:?Defina ASAAS_API_KEY (API key sandbox/produção Asaas)}"

validate_asaas_key "$ASAAS_API_KEY"
[[ -n "${ASAAS_WEBHOOK_TOKEN:-}" ]] && assert_not_placeholder "ASAAS_WEBHOOK_TOKEN" "$ASAAS_WEBHOOK_TOKEN"

upsert_env "ASAAS_API_KEY" "$ASAAS_API_KEY"
upsert_env "ASAAS_WEBHOOK_TOKEN" "${ASAAS_WEBHOOK_TOKEN:-}"
upsert_env "ASAAS_SANDBOX" "${ASAAS_SANDBOX:-true}"
upsert_env "ORDER_PAYMENT_PROVIDER" "${ORDER_PAYMENT_PROVIDER:-asaas}"
upsert_env "BILLING_PROVIDER" "${BILLING_PROVIDER:-asaas}"
upsert_env "PAYMENTS_SANDBOX" "${PAYMENTS_SANDBOX:-true}"
upsert_env "PIX_EXPIRATION_MINUTES" "${PIX_EXPIRATION_MINUTES:-30}"
upsert_env "PAYMENTS_ENABLED" "true"
upsert_env "PAYMENTS_PUBLIC_BASE_URL" "${PAYMENTS_PUBLIC_BASE_URL:-https://inovagastro360.inovatitech.com.br}"

# Stripe opcional (fallback)
if [[ -n "${STRIPE_SECRET_KEY:-}" ]]; then
  validate_stripe_key "$STRIPE_SECRET_KEY"
  upsert_env "STRIPE_SECRET_KEY" "$STRIPE_SECRET_KEY"
fi
if [[ -n "${STRIPE_WEBHOOK_SECRET:-}" ]]; then
  validate_stripe_webhook_secret "$STRIPE_WEBHOOK_SECRET"
  upsert_env "STRIPE_WEBHOOK_SECRET" "$STRIPE_WEBHOOK_SECRET"
fi

echo "OK — Asaas configurado em $ENV_FILE (PAYMENTS_ENABLED=true)"
echo "Webhook URL: https://inovagastro360.inovatitech.com.br/webhooks/asaas"
echo "  docker compose -f infra/hetzner/docker-compose.app.yml --env-file infra/hetzner/.env.production up -d --force-recreate api-gateway integrations"
