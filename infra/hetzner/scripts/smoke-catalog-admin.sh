#!/usr/bin/env bash
# T022 — smoke admin catálogo + vitrine pública
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
BASE="${SMOKE_BASE:-https://inovagastro360.inovatitech.com.br}"
LOCAL_API="${SMOKE_LOCAL_API:-http://127.0.0.1:8792}"
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

echo "==> API health"
code_health=$(curl -sf -o /dev/null -w "%{http_code}" "$LOCAL_API/health" 2>/dev/null || echo "000")
echo "    GET $LOCAL_API/health: $code_health"
if [[ "$code_health" != "200" ]]; then
  echo "    Aviso: api-gateway local indisponível — docker logs inova-gastro-360-api"
fi

echo "==> Login API"
login_tmp="$(mktemp)"
login_code=$(curl -sS -o "$login_tmp" -w "%{http_code}" -X POST "$BASE/api/v1/auth/login" \
  -H "content-type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}") || login_code="000"

if [[ "$login_code" != "200" ]]; then
  echo "    POST /api/v1/auth/login: HTTP $login_code"
  echo "    Resposta: $(head -c 400 "$login_tmp" 2>/dev/null || echo '?')"
  rm -f "$login_tmp"
  echo ""
  echo "Causas comuns:"
  echo "  • .env.production copiado do example (DATABASE_URL/JWT_SECRET com CHANGE_ME)"
  echo "  • Postgres inacessível do container api (host.docker.internal:5440)"
  echo "  • Senha demo diferente — ajuste SMOKE_EMAIL/SMOKE_PASSWORD"
  echo ""
  echo "Diagnóstico:"
  echo "  docker logs inova-gastro-360-api --tail 40"
  echo "  grep -E '^(DATABASE_URL|JWT_SECRET)=' infra/hetzner/.env.production | sed 's/=.*/=***/'"
  exit 1
fi

login_json="$(cat "$login_tmp")"
rm -f "$login_tmp"

TOKEN=$(echo "$login_json" | sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p')
if [[ -z "$TOKEN" ]]; then
  TOKEN=$(echo "$login_json" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
fi
[[ -n "$TOKEN" ]] || { echo "Token não encontrado na resposta login"; exit 1; }
echo "    Login OK"

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

env_file="$ROOT/infra/hetzner/.env.production"
if [[ -f "$env_file" ]] && grep -qE '^S3_ACCESS_KEY=(CHANGE_ME|$)' "$env_file" 2>/dev/null; then
  echo "    Aviso: S3_ACCESS_KEY ainda é placeholder — upload de fotos não funcionará"
elif [[ -f "$env_file" ]] && grep -q '^S3_BUCKET=' "$env_file" 2>/dev/null; then
  echo "    S3_* configurado em .env.production"
else
  echo "    Aviso: configure S3_* para upload de fotos (MINIO-CATALOG.md)"
fi

echo "==> Smoke catálogo OK"
