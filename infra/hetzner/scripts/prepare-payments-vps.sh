#!/usr/bin/env bash
# Modo "aguardando venda": infra de pagamentos pronta, credenciais inseridas depois.
# Uso na VPS (sempre a partir do clone do repo):
#   cd ~/inova-gastro-360
#   bash infra/hetzner/scripts/prepare-payments-vps.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT/infra/hetzner/.env.production}"
COMPOSE_FILE="$ROOT/infra/hetzner/docker-compose.app.yml"
PUBLIC_BASE="${PAYMENTS_PUBLIC_BASE_URL:-https://inovagastro360.inovatitech.com.br}"

cd "$ROOT"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Erro: $ENV_FILE não encontrado."
  echo "  cd ~/inova-gastro-360"
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

echo "==> Preparando pagamentos (modo dormant — sem credenciais reais)..."
upsert_env "PAYMENTS_ENABLED" "false"
upsert_env "PAYMENTS_PUBLIC_BASE_URL" "$PUBLIC_BASE"
upsert_env "MERCADOPAGO_ACCESS_TOKEN" "CHANGE_ME"
upsert_env "MERCADOPAGO_WEBHOOK_SECRET" "CHANGE_ME"
upsert_env "STRIPE_SECRET_KEY" "sk_test_CHANGE_ME"
upsert_env "STRIPE_WEBHOOK_SECRET" "whsec_CHANGE_ME"
upsert_env "STRIPE_PRICE_STARTER" "price_CHANGE_ME"
upsert_env "STRIPE_PRICE_PRO" "price_CHANGE_ME"
upsert_env "STRIPE_PRICE_ENTERPRISE" "price_CHANGE_ME"
upsert_env "PAYMENTS_SANDBOX" "true"
upsert_env "PIX_EXPIRATION_MINUTES" "30"

echo "==> Reiniciando nginx-proxy (rota /webhooks/ → integrations)..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" restart nginx-proxy

echo "==> Recriando workers (carregar PAYMENTS_ENABLED=false)..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --force-recreate api-gateway integrations

sleep 3

echo "==> Teste local nginx :9088 (esperado 401 ou 400, NÃO 404)..."
code_local=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  "http://127.0.0.1:9088/webhooks/mercadopago" \
  -H "content-type: application/json" \
  -d '{}' || echo "000")
echo "    HTTP local: $code_local"

echo "==> Teste público (Cloudflare Tunnel)..."
code_pub=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  "${PUBLIC_BASE}/webhooks/mercadopago" \
  -H "content-type: application/json" \
  -d '{}' || echo "000")
echo "    HTTP público: $code_pub"

echo
echo "URLs para cadastrar nos painéis (quando tiver credenciais):"
echo "  Mercado Pago: ${PUBLIC_BASE}/webhooks/mercadopago"
echo "  Stripe:       ${PUBLIC_BASE}/webhooks/stripe"
echo
if [[ "$code_local" == "404" ]]; then
  echo "AVISO: nginx local retornou 404 — confira infra/hetzner/nginx/inovagastro360.docker.conf (location /webhooks/)"
elif [[ "$code_pub" == "404" ]]; then
  echo "AVISO: URL pública 404 — Tunnel provavelmente aponta para :3102 ou :8792 em vez de :9088 (nginx)."
  echo "  Cloudflare Tunnel deve usar: service: http://127.0.0.1:9088"
  echo "  NÃO use inovagastro360-api.inovatitech.com.br para webhooks (é só api-gateway)."
fi
echo
echo "Quando vender o produto, rode:"
echo "  MERCADOPAGO_ACCESS_TOKEN=TEST-... STRIPE_SECRET_KEY=sk_test_... \\"
echo "  STRIPE_WEBHOOK_SECRET=whsec_... bash infra/hetzner/scripts/configure-payments-env-vps.sh"
echo "OK — prepare-payments-vps concluído."
