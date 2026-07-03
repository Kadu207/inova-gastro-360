#!/usr/bin/env bash
# Smoke upload multipart — API → MinIO (spec 014 T017)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
BASE="${SMOKE_BASE:-https://inovagastro360.inovatitech.com.br}"
LOCAL_API="${SMOKE_LOCAL_API:-http://127.0.0.1:8792}"
BRANCH_ID="${SMOKE_BRANCH_ID:-00000000-0000-4000-8000-000000000002}"
EMAIL="${SMOKE_EMAIL:-admin@inovagastro360.local}"
TENANT_SLUG="${SMOKE_TENANT_SLUG:-demo-burger}"
PASSWORD="${SMOKE_PASSWORD:?defina SMOKE_PASSWORD (não versionar senha)}"
PRODUCT_ID="${SMOKE_PRODUCT_ID:-}"

echo "==> Smoke upload foto @ $BASE"

login_tmp="$(mktemp)"
login_code=$(curl -sS -o "$login_tmp" -w "%{http_code}" -X POST "$BASE/api/v1/auth/login" \
  -H "content-type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"tenantSlug\":\"$TENANT_SLUG\"}") || login_code="000"

if [[ "$login_code" != "200" ]]; then
  echo "    Login falhou: HTTP $login_code"
  cat "$login_tmp"
  rm -f "$login_tmp"
  exit 1
fi

TOKEN=$(sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p' "$login_tmp")
rm -f "$login_tmp"
[[ -n "$TOKEN" ]] || { echo "Token ausente"; exit 1; }
echo "    Login OK"

if [[ -z "$PRODUCT_ID" ]]; then
  products_tmp="$(mktemp)"
  curl -sS -o "$products_tmp" \
    -H "Authorization: Bearer $TOKEN" \
    "$BASE/api/v1/branches/$BRANCH_ID/catalog/admin/products?includeUnavailable=1"
  PRODUCT_ID=$(sed -n 's/.*"id":"\([^"]*\)".*/\1/p' "$products_tmp" | head -1)
  rm -f "$products_tmp"
fi

if [[ -z "$PRODUCT_ID" ]]; then
  echo "    Erro: nenhum produto — crie um em /dashboard/catalogo ou exporte SMOKE_PRODUCT_ID"
  exit 1
fi
echo "    Produto: $PRODUCT_ID"

img="$(mktemp --suffix=.png)"
# 1×1 PNG transparente
printf '\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xdb\x00\x00\x00\x00IEND\xaeB`\x82' >"$img"

upload_tmp="$(mktemp)"
upload_code=$(curl -sS -o "$upload_tmp" -w "%{http_code}" -X POST \
  "$BASE/api/v1/branches/$BRANCH_ID/catalog/admin/products/$PRODUCT_ID/image" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@${img};type=image/png") || upload_code="000"

rm -f "$img"

echo "    POST .../products/$PRODUCT_ID/image: HTTP $upload_code"
body="$(cat "$upload_tmp")"
rm -f "$upload_tmp"

if [[ "$upload_code" != "200" ]]; then
  echo "    Resposta: ${body:0:500}"
  echo ""
  echo "Diagnóstico:"
  echo "  docker logs inova-gastro-360-api --tail 50"
  echo "  grep '^S3_' infra/hetzner/.env.production | sed 's/SECRET_KEY=.*/SECRET_KEY=***/'"
  echo "  bash infra/hetzner/scripts/connect-minio-network-vps.sh inova-platform-core-minio-1"
  exit 1
fi

PUBLIC_URL=$(echo "$body" | sed -n 's/.*"publicUrl":"\([^"]*\)".*/\1/p')
echo "    publicUrl: ${PUBLIC_URL:-?(ver JSON)}"

if [[ -n "$PUBLIC_URL" ]]; then
  media_path="${PUBLIC_URL#https://inovagastro360.inovatitech.com.br}"
  media_path="${media_path#http://inovagastro360.inovatitech.com.br}"
  if [[ "$media_path" != /* ]]; then
    media_path="/media/inova-gastro-360${media_path#*/inova-gastro-360}"
  fi
  img_code=$(curl -sS -o /dev/null -w "%{http_code}" "http://127.0.0.1:9088${media_path}" 2>/dev/null || echo "000")
  echo "    GET :9088${media_path} → HTTP ${img_code}"
  [[ "$img_code" == "200" ]] || { echo "    Falha: proxy /media/ HTTP ${img_code} — rode recreate-api-vps.sh"; exit 1; }
fi

echo "==> Smoke upload OK"
