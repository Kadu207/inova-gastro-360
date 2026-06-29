#!/usr/bin/env bash
# Conecta api-gateway à rede Docker do MinIO (quando porta 9000 não está publicada no host).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
# shellcheck source=lib/minio-vps.sh
source "$ROOT/infra/hetzner/scripts/lib/minio-vps.sh"

CONTAINER="${1:-$(minio_vps_default_container)}"
API="${2:-inova-gastro-360-api}"

if [[ -z "$CONTAINER" ]]; then
  echo "Erro: container MinIO não encontrado"
  exit 1
fi

minio_vps_connect_api "$CONTAINER" "$API"

echo "S3_ENDPOINT recomendado: $(minio_vps_s3_endpoint "$CONTAINER")"
