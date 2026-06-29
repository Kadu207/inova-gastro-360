#!/usr/bin/env bash
# Grava S3_* no .env.production a partir do MinIO existente na VPS.
# Uso: bash configure-s3-env-vps.sh [container_minio] [porta_host_opcional]
# Ex.: bash configure-s3-env-vps.sh inova-platform-core-minio-1
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
ENV_FILE="$ROOT/infra/hetzner/.env.production"
CONTAINER="${1:-}"
HOST_PORT_OVERRIDE="${2:-}"
# shellcheck source=lib/minio-vps.sh
source "$ROOT/infra/hetzner/scripts/lib/minio-vps.sh"

cd "$ROOT"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Erro: $ENV_FILE não encontrado"
  exit 1
fi

MINIO_CONTAINERS="$(docker ps --format '{{.Names}}' | grep -i minio || true)"

if [[ -z "$CONTAINER" ]]; then
  CONTAINER="$(echo "$MINIO_CONTAINERS" | head -1 || true)"
  [[ -n "$CONTAINER" ]] && echo "==> Auto-detectado container MinIO: $CONTAINER"
fi

if [[ -z "$CONTAINER" ]]; then
  echo "Erro: nenhum container MinIO. Rode: bash infra/hetzner/scripts/discover-minio-vps.sh"
  exit 1
fi

if ! docker inspect "$CONTAINER" >/dev/null 2>&1; then
  echo "Erro: container '$CONTAINER' não existe ou não está rodando."
  echo ""
  echo "Containers MinIO disponíveis:"
  echo "$MINIO_CONTAINERS" | sed 's/^/  /'
  echo ""
  FIRST="$(echo "$MINIO_CONTAINERS" | head -1)"
  echo "Ex.: bash infra/hetzner/scripts/configure-s3-env-vps.sh ${FIRST:-inova-platform-core-minio-1}"
  exit 1
fi

ACCESS="$(docker exec "$CONTAINER" printenv MINIO_ROOT_USER 2>/dev/null || docker exec "$CONTAINER" printenv MINIO_ACCESS_KEY 2>/dev/null || true)"
SECRET="$(docker exec "$CONTAINER" printenv MINIO_ROOT_PASSWORD 2>/dev/null || docker exec "$CONTAINER" printenv MINIO_SECRET_KEY 2>/dev/null || true)"

if [[ -z "$ACCESS" || -z "$SECRET" ]]; then
  echo "Erro: não foi possível ler credenciais de $CONTAINER"
  exit 1
fi

PUBLISHED_PORT="$(minio_vps_published_port "$CONTAINER")"
if [[ -n "$HOST_PORT_OVERRIDE" ]]; then
  S3_ENDPOINT="http://host.docker.internal:${HOST_PORT_OVERRIDE}"
  MINIO_MODE="host:${HOST_PORT_OVERRIDE}"
elif [[ -n "$PUBLISHED_PORT" ]]; then
  S3_ENDPOINT="http://host.docker.internal:${PUBLISHED_PORT}"
  MINIO_MODE="host:${PUBLISHED_PORT}"
else
  echo "==> MinIO sem porta publicada no host — usando rede Docker interna"
  bash "$ROOT/infra/hetzner/scripts/connect-minio-network-vps.sh" "$CONTAINER"
  S3_ENDPOINT="$(minio_vps_s3_endpoint "$CONTAINER")"
  MINIO_MODE="docker-network"
fi

PUBLIC_URL="${S3_PUBLIC_BASE_URL:-$(minio_vps_public_base_url "https://inovagastro360.inovatitech.com.br" "$BUCKET")}"
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
set_or_replace MINIO_CONTAINER "$CONTAINER"

echo "==> S3 configurado em $ENV_FILE (container $CONTAINER, modo $MINIO_MODE)"
grep -E '^S3_' "$ENV_FILE" | sed 's/SECRET_KEY=.*/SECRET_KEY=***/'

echo ""
echo "Próximo:"
echo "  bash infra/hetzner/scripts/setup-minio-catalog.sh"
echo "  bash infra/hetzner/scripts/recreate-api-vps.sh"
