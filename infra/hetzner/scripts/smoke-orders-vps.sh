#!/usr/bin/env bash
# spec 003 — smoke pedidos: criar, listar, filtrar, atualizar status + páginas painel
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
BASE="${SMOKE_BASE:-https://inovagastro360.inovatitech.com.br}"
LOCAL_API="${SMOKE_LOCAL_API:-http://127.0.0.1:8792}"
BRANCH_ID="${SMOKE_BRANCH_ID:-00000000-0000-4000-8000-000000000002}"
PRODUCT_ID="${SMOKE_PRODUCT_ID:-00000000-0000-4000-8000-000000000020}"
EMAIL="${SMOKE_EMAIL:-admin@inovagastro360.local}"
TENANT_SLUG="${SMOKE_TENANT_SLUG:-demo-burger}"
PASSWORD="${SMOKE_PASSWORD:?defina SMOKE_PASSWORD (não versionar senha)}"
SMOKE_NAME="Smoke Pedido $(date +%H%M%S)"

echo "==> Smoke pedidos @ $BASE"

for page in painel/balcao painel/cozinha painel/delivery; do
  code=$(curl -sf -o /dev/null -w "%{http_code}" "$BASE/$page" || echo "000")
  echo "    GET /$page: $code"
  [[ "$code" == "200" ]] || { echo "Falha página $page"; exit 1; }
done

code_health=$(curl -sf -o /dev/null -w "%{http_code}" "$LOCAL_API/health" 2>/dev/null || echo "000")
echo "    GET $LOCAL_API/health: $code_health"
[[ "$code_health" == "200" ]] || echo "    Aviso: api-gateway local indisponível"

echo "==> Login API"
login_tmp="$(mktemp)"
login_code=$(curl -sS -o "$login_tmp" -w "%{http_code}" -X POST "$BASE/api/v1/auth/login" \
  -H "content-type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"tenantSlug\":\"$TENANT_SLUG\"}") || login_code="000"

if [[ "$login_code" != "200" ]]; then
  echo "    POST /api/v1/auth/login: HTTP $login_code"
  cat "$login_tmp" 2>/dev/null | head -c 400 || true
  rm -f "$login_tmp"
  exit 1
fi

login_json="$(cat "$login_tmp")"
rm -f "$login_tmp"

TOKEN=$(echo "$login_json" | sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p')
[[ -n "$TOKEN" ]] || TOKEN=$(echo "$login_json" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
[[ -n "$TOKEN" ]] || { echo "Token não encontrado"; exit 1; }
echo "    Login OK"

echo "==> Criar pedido"
create_tmp="$(mktemp)"
create_code=$(curl -sS -o "$create_tmp" -w "%{http_code}" -X POST "$BASE/api/v1/orders" \
  -H "Authorization: Bearer $TOKEN" \
  -H "content-type: application/json" \
  -d "{
    \"branchId\": \"$BRANCH_ID\",
    \"channel\": \"web\",
    \"customerName\": \"$SMOKE_NAME\",
    \"customerPhone\": \"11999990000\",
    \"items\": [{\"productId\": \"$PRODUCT_ID\", \"quantity\": 1}]
  }") || create_code="000"

echo "    POST /api/v1/orders: HTTP $create_code"
[[ "$create_code" == "201" ]] || { head -c 500 "$create_tmp"; rm -f "$create_tmp"; exit 1; }

create_json="$(cat "$create_tmp")"
rm -f "$create_tmp"

ORDER_ID=$(echo "$create_json" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p' | head -1)
ORDER_NUM=$(echo "$create_json" | sed -n 's/.*"orderNumber":\([0-9]*\).*/\1/p' | head -1)
[[ -n "$ORDER_ID" ]] || { echo "order.id ausente na resposta"; exit 1; }
echo "    Pedido: #$ORDER_NUM ($ORDER_ID)"

echo "==> Listar pedidos (branch + canal web)"
list_code=$(curl -sf -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE/api/v1/orders?branchId=$BRANCH_ID&channel=web&limit=5") || list_code="000"
echo "    GET orders?channel=web: $list_code"
[[ "$list_code" == "200" ]] || exit 1

echo "==> Busca por nome (q=)"
search_code=$(curl -sf -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE/api/v1/orders?branchId=$BRANCH_ID&q=Smoke") || search_code="000"
echo "    GET orders?q=Smoke: $search_code"
[[ "$search_code" == "200" ]] || exit 1

echo "==> Atualizar status → accepted"
patch_code=$(curl -sf -o /dev/null -w "%{http_code}" -X PATCH \
  "$BASE/api/v1/orders/$ORDER_ID/status" \
  -H "Authorization: Bearer $TOKEN" \
  -H "content-type: application/json" \
  -d '{"status":"accepted"}') || patch_code="000"
echo "    PATCH orders/.../status: $patch_code"
[[ "$patch_code" == "200" ]] || exit 1

echo "==> Smoke pedidos OK"
