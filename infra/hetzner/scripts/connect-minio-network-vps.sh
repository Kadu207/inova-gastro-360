#!/usr/bin/env bash
# Conecta api-gateway + nginx à rede Docker do MinIO (mídia /media/*).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
# shellcheck source=lib/minio-vps.sh
source "$ROOT/infra/hetzner/scripts/lib/minio-vps.sh"

CONTAINER="${1:-$(minio_vps_default_container)}"

if [[ -z "$CONTAINER" ]]; then
  echo "Erro: container MinIO não encontrado"
  exit 1
fi

minio_vps_connect_media_stack "$CONTAINER"

echo "S3_ENDPOINT: $(minio_vps_s3_endpoint "$CONTAINER")"
echo "S3_PUBLIC_BASE_URL sugerido: $(minio_vps_public_base_url)"
