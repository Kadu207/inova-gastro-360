#!/usr/bin/env bash
# Proxy /media/* + S3_PUBLIC_BASE_URL + URLs antigas cdn.inovatitech.com.br
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
ENV_FILE="$ROOT/infra/hetzner/.env.production"
COMPOSE_FILE="$ROOT/infra/hetzner/docker-compose.app.yml"
PG_CONTAINER="${POSTGRES_CONTAINER:-inova-gastro-360-postgres}"
MINIO_CONTAINER="${MINIO_CONTAINER:-inova-platform-core-minio-1}"
APP_BASE="${APP_PUBLIC_URL:-https://inovagastro360.inovatitech.com.br}"
BUCKET="${S3_BUCKET:-inova-gastro-360}"

# shellcheck source=lib/minio-vps.sh
source "$ROOT/infra/hetzner/scripts/lib/minio-vps.sh"

cd "$ROOT"

NEW_PUBLIC="$(minio_vps_public_base_url "$APP_BASE" "$BUCKET")"
OLD_CDN="https://cdn.inovatitech.com.br/${BUCKET}"

echo "==> S3_PUBLIC_BASE_URL → $NEW_PUBLIC"
if [[ -f "$ENV_FILE" ]]; then
  if grep -q '^S3_PUBLIC_BASE_URL=' "$ENV_FILE"; then
    sed -i "s|^S3_PUBLIC_BASE_URL=.*|S3_PUBLIC_BASE_URL=${NEW_PUBLIC}|" "$ENV_FILE"
  else
    echo "S3_PUBLIC_BASE_URL=${NEW_PUBLIC}" >>"$ENV_FILE"
  fi
  NET="$(minio_vps_ensure_compose_network_env "$MINIO_CONTAINER" "$ENV_FILE")"
  echo "    MINIO_DOCKER_NETWORK=${NET}"
fi

echo "==> Recriar nginx + api (rede MinIO persistente no compose)"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --force-recreate nginx-proxy api-gateway

sleep 3

echo "==> Fallback: connect manual (compose external network)"
bash "$ROOT/infra/hetzner/scripts/connect-minio-network-vps.sh" "$MINIO_CONTAINER" || true

echo "==> Política download tenants/ (vitrine pública)"
bash "$ROOT/infra/hetzner/scripts/setup-minio-catalog.sh" || true

echo "==> Migrar image_url no Postgres (cdn → /media/)"
docker exec "$PG_CONTAINER" psql -U inova_gastro -d inova_gastro_360 -c \
  "UPDATE products SET image_url = REPLACE(image_url, '${OLD_CDN}', '${NEW_PUBLIC}'), updated_at = NOW() WHERE image_url LIKE '${OLD_CDN}%';"

echo ""
echo "==> Smoke GET mídia (primeira URL no banco)"
sample_url="$(docker exec "$PG_CONTAINER" psql -U inova_gastro -d inova_gastro_360 -t -A -c \
  "SELECT image_url FROM products WHERE image_url IS NOT NULL AND image_url <> '' LIMIT 1;" 2>/dev/null | tr -d '\r' || true)"
if [[ -n "$sample_url" ]]; then
  path="${sample_url#https://inovagastro360.inovatitech.com.br}"
  path="${path#http://inovagastro360.inovatitech.com.br}"
  code=$(curl -sS -o /dev/null -w "%{http_code}" "http://127.0.0.1:9088${path}" 2>/dev/null || echo "000")
  echo "    GET :9088${path} → HTTP ${code}"
  [[ "$code" == "200" ]] && echo "==> OK — fotos devem aparecer no cardápio" || echo "Aviso: HTTP ${code} — docker exec inova-gastro-360-nginx wget -qO- http://inova-platform-core-minio-1:9000/inova-gastro-360/tenants/.keep"
else
  echo "    (nenhuma foto no banco ainda)"
fi

echo ""
echo "Próximo: bash infra/hetzner/scripts/smoke-catalog-upload.sh"
