#!/usr/bin/env bash
# T022 — smoke admin catálogo + vitrine pública
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
BASE="${SMOKE_BASE:-https://inovagastro360.inovatitech.com.br}"
BRANCH_ID="${SMOKE_BRANCH_ID:-00000000-0000-4000-8000-000000000002}"
EMAIL="${SMOKE_EMAIL:-admin@inovagastro360.local}"
PASSWORD="${SMOKE_PASSWORD:-InovaGastro360!}"

echo "==> Smoke catálogo @ $BASE"

code_public=$(curl -sf -o /dev/null -w "%{http_code}" "$BASE/cardapio" || echo "000")
echo "    GET /cardapio (público): $code_public"
[[ "$code_public" == "200" ]] || { echo "Falha vitrine pública"; exit 1; }

code_admin_page=$(curl -sf -o /dev/null -w "%{http_code}" "$BASE/dashboard/catalogo" || echo "000")
echo "    GET /dashboard/catalogo (static): $code_admin_page"
[[ "$code_admin_page" == "200" ]] || { echo "Falha página admin"; exit 1; }

echo "==> Login API"
login_json=$(curl -sf -X POST "$BASE/api/v1/auth/login" \
  -H "content-type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}") || { echo "Login falhou"; exit 1; }

TOKEN=$(echo "$login_json" | sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p')
if [[ -z "$TOKEN" ]]; then
  TOKEN=$(echo "$login_json" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
fi
[[ -n "$TOKEN" ]] || { echo "Token não encontrado na resposta login"; exit 1; }

code_cats=$(curl -sf -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE/api/v1/branches/$BRANCH_ID/catalog/admin/categories?includeInactive=1") || echo "000"
echo "    GET admin/categories: $code_cats"
[[ "$code_cats" == "200" ]] || { echo "Falha API admin categorias"; exit 1; }

code_products=$(curl -sf -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE/api/v1/branches/$BRANCH_ID/catalog/admin/products?includeUnavailable=1") || echo "000"
echo "    GET admin/products: $code_products"
[[ "$code_products" == "200" ]] || { echo "Falha API admin produtos"; exit 1; }

code_pub_cats=$(curl -sf -o /dev/null -w "%{http_code}" \
  "$BASE/api/v1/branches/$BRANCH_ID/catalog/categories") || echo "000"
echo "    GET catalog/categories (público): $code_pub_cats"
[[ "$code_pub_cats" == "200" ]] || { echo "Falha API pública categorias"; exit 1; }

if grep -q '^S3_BUCKET=' "$ROOT/infra/hetzner/.env.production" 2>/dev/null; then
  echo "    S3_* configurado em .env.production"
else
  echo "    Aviso: configure S3_* para upload de fotos (MINIO-CATALOG.md)"
fi

echo "==> Smoke catálogo OK"
