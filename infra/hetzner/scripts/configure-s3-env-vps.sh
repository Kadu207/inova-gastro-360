#!/usr/bin/env bash
# Grava S3_* no .env.production a partir do MinIO existente na VPS.
# Uso: bash configure-s3-env-vps.sh [container_minio] [porta_host]
# Ex.: bash configure-s3-env-vps.sh minio 9000
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
ENV_FILE="$ROOT/infra/hetzner/.env.production"
CONTAINER="${1:-}"
HOST_PORT="${2:-9000}"

cd "$ROOT"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Erro: $ENV_FILE não encontrado"
  exit 1
fi

if [[ -z "$CONTAINER" ]]; then
  CONTAINER="$(docker ps --format '{{.Names}}' | grep -i minio | head -1 || true)"
fi

if [[ -z "$CONTAINER" ]]; then
  echo "Erro: nenhum container MinIO. Rode: bash infra/hetzner/scripts/discover-minio-vps.sh"
  exit 1
fi

ACCESS="$(docker exec "$CONTAINER" printenv MINIO_ROOT_USER 2>/dev/null || docker exec "$CONTAINER" printenv MINIO_ACCESS_KEY 2>/dev/null || true)"
SECRET="$(docker exec "$CONTAINER" printenv MINIO_ROOT_PASSWORD 2>/dev/null || docker exec "$CONTAINER" printenv MINIO_SECRET_KEY 2>/dev/null || true)"

if [[ -z "$ACCESS" || -z "$SECRET" ]]; then
  echo "Erro: não foi possível ler credenciais de $CONTAINER"
  exit 1
fi

# api-gateway alcança MinIO via host publicado (mesmo padrão do Postgres)
S3_ENDPOINT="http://host.docker.internal:${HOST_PORT}"
PUBLIC_URL="${S3_PUBLIC_BASE_URL:-https://cdn.inovatitech.com.br/inova-gastro-360}"
BUCKET="${S3_BUCKET:-inova-gastro-360}"

set_or_replace() {
  local key="$1"
  local val="$2"
  if grep -q "^${key}=" "$ENV_FILE"; then
    sed -i "s|^${key}=.*|${key}=${val}|" "$ENV_FILE"
  else
    echo "${key}=${val}" >>"$ENV_FILE"
  fi
}

set_or_replace STORAGE_PROVIDER minio
set_or_replace S3_ENDPOINT "$S3_ENDPOINT"
set_or_replace S3_REGION auto
set_or_replace S3_BUCKET "$BUCKET"
set_or_replace S3_ACCESS_KEY "$ACCESS"
set_or_replace S3_SECRET_KEY "$SECRET"
set_or_replace S3_PUBLIC_BASE_URL "$PUBLIC_URL"

echo "==> S3 configurado em $ENV_FILE (container $CONTAINER, host :$HOST_PORT)"
grep -E '^S3_' "$ENV_FILE" | sed 's/SECRET_KEY=.*/SECRET_KEY=***/'

echo ""
echo "Próximo:"
echo "  MINIO_HOST_ENDPOINT=http://127.0.0.1:${HOST_PORT} bash infra/hetzner/scripts/setup-minio-catalog.sh"
echo "  bash infra/hetzner/scripts/recreate-api-vps.sh"
