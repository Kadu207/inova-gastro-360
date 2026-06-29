#!/usr/bin/env bash
# Descobre MinIO na VPS compartilhada (containers + portas + credenciais).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
# shellcheck source=lib/minio-vps.sh
source "$ROOT/infra/hetzner/scripts/lib/minio-vps.sh"

echo "==> Containers MinIO"
docker ps --format 'table {{.Names}}\t{{.Ports}}\t{{.Status}}' | grep -i minio || echo "    (nenhum)"

echo ""
FIRST="$(minio_vps_default_container)"

if [[ -n "$FIRST" ]]; then
  echo "==> Port mapping $FIRST (API S3)"
  docker port "$FIRST" 9000 2>/dev/null || echo "    (9000 NÃO publicada no host — usar rede Docker interna)"

  echo ""
  echo "==> Rede Docker"
  docker inspect "$FIRST" --format '{{range $k, $v := .NetworkSettings.Networks}}  {{$k}}{{end}}' 2>/dev/null || true

  echo ""
  echo "==> Env $FIRST"
  docker exec "$FIRST" printenv MINIO_ROOT_USER 2>/dev/null | sed 's/^/  MINIO_ROOT_USER=/' || true
  docker exec "$FIRST" printenv MINIO_ROOT_PASSWORD 2>/dev/null | sed 's/^/  MINIO_ROOT_PASSWORD=***/' || true

  PUBLISHED="$(minio_vps_published_port "$FIRST")"
  echo ""
  if [[ -n "$PUBLISHED" ]]; then
    echo "Modo: host publicado → S3_ENDPOINT=http://host.docker.internal:${PUBLISHED}"
  else
    echo "Modo: rede interna → S3_ENDPOINT=http://${FIRST}:9000"
    echo "       (api-gateway será conectado à rede do MinIO automaticamente)"
  fi

  echo ""
  echo "Próximo passo (copie e cole):"
  echo "  bash infra/hetzner/scripts/configure-s3-env-vps.sh ${FIRST}"
else
  echo ""
  echo "Nenhum MinIO encontrado — suba inova-platform-core ou configure S3_* manualmente."
fi
