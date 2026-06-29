#!/usr/bin/env bash
# Descobre MinIO na VPS compartilhada (containers + portas + credenciais).
set -euo pipefail

echo "==> Containers MinIO"
docker ps --format 'table {{.Names}}\t{{.Ports}}\t{{.Status}}' | grep -i minio || echo "    (nenhum)"

echo ""
echo "==> Portas 9000-9001 no host"
ss -tlnp 2>/dev/null | grep -E ':900[0-9]' || true

echo ""
for name in $(docker ps --format '{{.Names}}' | grep -i minio || true); do
  echo "==> Env $name"
  docker exec "$name" printenv MINIO_ROOT_USER 2>/dev/null | sed 's/^/  MINIO_ROOT_USER=/' || true
  docker exec "$name" printenv MINIO_ROOT_PASSWORD 2>/dev/null | sed 's/^/  MINIO_ROOT_PASSWORD=***/' || true
  docker exec "$name" printenv MINIO_ACCESS_KEY 2>/dev/null | sed 's/^/  MINIO_ACCESS_KEY=/' || true
  echo ""
done

FIRST="$(docker ps --format '{{.Names}}' | grep -i minio | head -1 || true)"
HOST_PORT="$(ss -tlnp 2>/dev/null | grep -oE ':900[0-9]' | head -1 | tr -d ':' || echo 9000)"

echo "Para api-gateway (Docker), use S3_ENDPOINT=http://host.docker.internal:${HOST_PORT}"
echo ""
if [[ -n "$FIRST" ]]; then
  echo "Próximo passo (copie e cole):"
  echo "  bash infra/hetzner/scripts/configure-s3-env-vps.sh ${FIRST} ${HOST_PORT}"
else
  echo "Nenhum MinIO encontrado — suba o stack inova-platform-core ou ajuste manualmente S3_* no .env.production"
fi
