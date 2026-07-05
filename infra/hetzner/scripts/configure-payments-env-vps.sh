#!/usr/bin/env bash
# Configura variáveis de pagamento (Mercado Pago + Stripe) em .env.production na VPS.
# Não grava segredos no repositório — valores via argumentos ou prompt.
# Rejeita placeholders de documentação (... , CHANGE_ME, exemplos do runbook).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT/infra/hetzner/.env.production}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Arquivo não encontrado: $ENV_FILE"
  echo "  cp infra/hetzner/.env.production.example infra/hetzner/.env.production"
  exit 1
fi

fail() {
  echo "ERRO: $*" >&2
  exit 1
}

fail_placeholder() {
  local name="$1"
  local value="$2"
  local preview="${value:0:24}"
  [[ ${#value} -gt 24 ]] && preview="${preview}…"
  fail "${name} parece placeholder ou exemplo de documentação (\"${preview}\").
Use credenciais copiadas dos painéis Mercado Pago / Stripe — não cole ... nem tokens de tutorial."
}

# Alinhado a apps/workers/api-gateway/src/lib/payments-config.ts
is_obvious_placeholder() {
  local value="$1"
  local v="${value// /}"

  [[ -z "$v" ]] && return 0
  [[ "$v" == *"..."* ]] && return 0
  [[ "$v" =~ ^(CHANGE_ME|your-|price_test_|price_CHANGE_ME|sk_test_CHANGE_ME|whsec_CHANGE_ME) ]] && return 0
  [[ "$v" =~ ^(sua-assinatura|example|placeholder|dummy|fake|todo) ]] && return 0
  [[ "$v" =~ TEST-1234567890 ]] && return 0
  [[ "$v" =~ sk_test_51AbCd ]] && return 0
  [[ "$v" =~ whsec_abc123 ]] && return 0
  [[ "$v" =~ price_1AbCd ]] && return 0
  [[ "$v" =~ price_1XyZ ]] && return 0
  [[ "$v" =~ -abc-xxxxxxxx ]] && return 0
  [[ "$v" =~ x{8,}$ ]] && return 0

  return 1
}

assert_not_placeholder() {
  local name="$1"
  local value="$2"
  if is_obvious_placeholder "$value"; then
    fail_placeholder "$name" "$value"
  fi
}

validate_mp_token() {
  local v="$1"
  assert_not_placeholder "MERCADOPAGO_ACCESS_TOKEN" "$v"
  [[ "$v" =~ ^(TEST-|APP_USR-) ]] || fail "MERCADOPAGO_ACCESS_TOKEN deve começar com TEST- ou APP_USR-"
  [[ ${#v} -ge 24 ]] || fail "MERCADOPAGO_ACCESS_TOKEN curto demais (${#v} caracteres)"
}

validate_mp_webhook_secret() {
  local v="$1"
  [[ -z "$v" ]] && return 0
  assert_not_placeholder "MERCADOPAGO_WEBHOOK_SECRET" "$v"
  [[ ${#v} -ge 8 ]] || fail "MERCADOPAGO_WEBHOOK_SECRET curto demais (${#v} caracteres)"
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

validate_stripe_price() {
  local name="$1"
  local v="$2"
  assert_not_placeholder "$name" "$v"
  [[ "$v" =~ ^price_ ]] || fail "${name} deve começar com price_ (Dashboard Stripe → Products)"
  [[ ${#v} -ge 12 ]] || fail "${name} curto demais (${#v} caracteres)"
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

: "${MERCADOPAGO_ACCESS_TOKEN:?Defina MERCADOPAGO_ACCESS_TOKEN (token real do painel MP)}"
: "${STRIPE_SECRET_KEY:?Defina STRIPE_SECRET_KEY (sk_test_ ou sk_live_ real)}"
: "${STRIPE_WEBHOOK_SECRET:?Defina STRIPE_WEBHOOK_SECRET (whsec_ do endpoint Stripe)}"
: "${STRIPE_PRICE_STARTER:?Defina STRIPE_PRICE_STARTER (price_... do plano Starter)}"
: "${STRIPE_PRICE_PRO:?Defina STRIPE_PRICE_PRO (price_... do plano Pro)}"

validate_mp_token "$MERCADOPAGO_ACCESS_TOKEN"
validate_mp_webhook_secret "${MERCADOPAGO_WEBHOOK_SECRET:-}"
validate_stripe_key "$STRIPE_SECRET_KEY"
validate_stripe_webhook_secret "$STRIPE_WEBHOOK_SECRET"
validate_stripe_price "STRIPE_PRICE_STARTER" "$STRIPE_PRICE_STARTER"
validate_stripe_price "STRIPE_PRICE_PRO" "$STRIPE_PRICE_PRO"

if [[ -n "${STRIPE_PRICE_ENTERPRISE:-}" ]]; then
  validate_stripe_price "STRIPE_PRICE_ENTERPRISE" "$STRIPE_PRICE_ENTERPRISE"
fi

upsert_env "MERCADOPAGO_ACCESS_TOKEN" "$MERCADOPAGO_ACCESS_TOKEN"
upsert_env "MERCADOPAGO_WEBHOOK_SECRET" "${MERCADOPAGO_WEBHOOK_SECRET:-}"
upsert_env "STRIPE_SECRET_KEY" "$STRIPE_SECRET_KEY"
upsert_env "STRIPE_WEBHOOK_SECRET" "$STRIPE_WEBHOOK_SECRET"
upsert_env "PAYMENTS_SANDBOX" "${PAYMENTS_SANDBOX:-false}"
upsert_env "PIX_EXPIRATION_MINUTES" "${PIX_EXPIRATION_MINUTES:-30}"
upsert_env "STRIPE_PRICE_STARTER" "$STRIPE_PRICE_STARTER"
upsert_env "STRIPE_PRICE_PRO" "$STRIPE_PRICE_PRO"
upsert_env "STRIPE_PRICE_ENTERPRISE" "${STRIPE_PRICE_ENTERPRISE:-}"
upsert_env "PAYMENTS_ENABLED" "true"
upsert_env "PAYMENTS_PUBLIC_BASE_URL" "${PAYMENTS_PUBLIC_BASE_URL:-https://inovagastro360.inovatitech.com.br}"

echo "OK — variáveis de pagamento atualizadas em $ENV_FILE"
echo "PAYMENTS_ENABLED=true — recrie api-gateway + integrations:"
echo "  bash infra/hetzner/scripts/prepare-payments-vps.sh  # só se quiser desligar de novo"
echo "  docker compose -f infra/hetzner/docker-compose.app.yml --env-file infra/hetzner/.env.production up -d --force-recreate api-gateway integrations"
