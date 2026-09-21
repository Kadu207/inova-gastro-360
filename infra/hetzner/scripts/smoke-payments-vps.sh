#!/usr/bin/env bash
# Smoke spec 007 — pagamentos (apply-order interno + health workers)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT/infra/hetzner/.env.production}"
# shellcheck disable=SC1090
source "$ENV_FILE" 2>/dev/null || true

API_URL="${API_URL:-https://inovagastro360.inovatitech.com.br}"
INTERNAL_SECRET="${INTERNAL_SHARED_SECRET:?INTERNAL_SHARED_SECRET obrigatório}"

echo "== Health API (local :8792; /health público pode 404 via nginx→web) =="
curl -sf "http://127.0.0.1:8792/health" | head -c 200
echo

echo "== Health integrations (via proxy interno se configurado) =="
curl -sf "${INTEGRATIONS_URL:-http://127.0.0.1:8791}/health" 2>/dev/null | head -c 200 || echo "(integrations local skip)"
echo

echo "== POST apply-order (dry validation — espera 400 validation) =="
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/internal/payments/apply-order" \
  -H "content-type: application/json" \
  -H "x-internal-secret: $INTERNAL_SECRET" \
  -d '{"invalid":true}')
if [[ "$code" != "400" && "$code" != "403" ]]; then
  echo "Falha: esperado 400/403, recebeu $code"
  exit 1
fi
echo "OK apply-order reachable (HTTP $code)"

echo "== Billing plans público =="
curl -sf "$API_URL/api/v1/billing/plans" | head -c 300
echo

echo "== Payments status =="
curl -sf "$API_URL/api/v1/payments/status" | head -c 400
echo

echo "== Webhook Asaas (esperado 401/400, NÃO 404) =="
wh_code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/webhooks/asaas" \
  -H "content-type: application/json" -d '{}' || echo "000")
echo "HTTP $wh_code"
if [[ "$wh_code" == "404" ]]; then
  echo "Falha: webhook 404 — Tunnel deve apontar para nginx :9088 (ver payments-go-live.md)"
  exit 1
fi

echo "Smoke pagamentos OK (sandbox: cardápio PIX Asaas + billing Asaas/Stripe)"
