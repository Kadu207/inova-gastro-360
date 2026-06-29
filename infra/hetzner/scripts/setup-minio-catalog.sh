#!/usr/bin/env bash
# T021 — bucket MinIO para fotos do catálogo (spec 014)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
ENV_FILE="$ROOT/infra/hetzner/.env.production"
BUCKET="${S3_BUCKET:-inova-gastro-360}"
# shellcheck source=lib/minio-vps.sh
source "$ROOT/infra/hetzner/scripts/lib/minio-vps.sh"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source <(grep -E '^[A-Za-z_][A-Za-z0-9_]*=' "$ENV_FILE" | sed 's/\r$//')
  set +a
fi

MINIO_CONTAINER="${MINIO_CONTAINER:-$(minio_vps_default_container)}"
MINIO_USER="${S3_ACCESS_KEY:-${MINIO_ROOT_USER:-}}"
MINIO_PASS="${S3_SECRET_KEY:-${MINIO_ROOT_PASSWORD:-}}"

if [[ "$MINIO_USER" == "CHANGE_ME" || "$MINIO_PASS" == "CHANGE_ME" || -z "$MINIO_USER" || -z "$MINIO_PASS" ]]; then
  echo "Erro: credenciais MinIO inválidas em $ENV_FILE"
  echo "  Rode: bash infra/hetzner/scripts/configure-s3-env-vps.sh"
  exit 1
fi

if [[ -z "$MINIO_CONTAINER" ]]; then
  echo "Erro: container MinIO não encontrado"
  exit 1
fi

PUBLISHED_PORT="$(minio_vps_published_port "$MINIO_CONTAINER")"
USE_DOCKER_MC=0
LOCAL_ENDPOINT="${MINIO_HOST_ENDPOINT:-}"

if [[ -z "$LOCAL_ENDPOINT" || "$LOCAL_ENDPOINT" == docker-network://* ]]; then
  if [[ -n "$PUBLISHED_PORT" ]]; then
    LOCAL_ENDPOINT="http://127.0.0.1:${PUBLISHED_PORT}"
  else
    USE_DOCKER_MC=1
    LOCAL_ENDPOINT="http://127.0.0.1:9000"
    minio_vps_mc_init_config_vol
    echo "==> MinIO só na rede Docker ($MINIO_CONTAINER) — mc via container"
  fi
fi

LOCAL_ENDPOINT="${LOCAL_ENDPOINT/minio:9000/127.0.0.1:9000}"
LOCAL_ENDPOINT="${LOCAL_ENDPOINT/host.docker.internal/127.0.0.1}"

mc_cmd() {
  if [[ "$USE_DOCKER_MC" == 1 ]]; then
    minio_vps_mc_run "$MINIO_CONTAINER" "$@"
  elif command -v mc >/dev/null 2>&1; then
    mc "$@"
  else
    echo "Instale mc ou use MinIO na rede Docker (configure-s3-env-vps.sh detecta automaticamente)"
    exit 1
  fi
}

echo "==> Alias MinIO ($LOCAL_ENDPOINT)"
mc_cmd alias set inova-catalog "$LOCAL_ENDPOINT" "$MINIO_USER" "$MINIO_PASS"

echo "==> Testar conexão"
if ! mc_cmd ls inova-catalog >/dev/null 2>&1; then
  echo "Erro: não foi possível listar buckets em $LOCAL_ENDPOINT"
  echo "  Container: $MINIO_CONTAINER"
  echo "  bash infra/hetzner/scripts/discover-minio-vps.sh"
  exit 1
fi

echo "==> Bucket $BUCKET"
mc_cmd mb "inova-catalog/$BUCKET" --ignore-existing

echo "==> Prefixo tenants/ (leitura pública na vitrine)"
printf '' | mc_cmd pipe "inova-catalog/$BUCKET/tenants/.keep" 2>/dev/null || true
if mc_cmd anonymous set download "inova-catalog/$BUCKET/tenants" 2>/dev/null; then
  echo "    Política download em tenants/ OK"
else
  echo "    Aviso: anonymous download em tenants/ falhou — vitrine pode precisar CDN/nginx"
fi

echo "==> CORS (presign browser)"
CORS_FILE="$(mktemp)"
cat >"$CORS_FILE" <<'JSON'
[
  {
    "AllowedOrigin": ["https://inovagastro360.inovatitech.com.br"],
    "AllowedMethod": ["PUT", "GET", "HEAD"],
    "AllowedHeader": ["Content-Type", "Authorization", "x-amz-*"],
    "ExposeHeader": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
JSON
if [[ "$USE_DOCKER_MC" == 1 ]]; then
  docker run --rm --network "container:${MINIO_CONTAINER}" \
    -v "${MINIO_MC_CONFIG_VOL}:/root/.mc" \
    -v "$CORS_FILE:/tmp/cors.json:ro" minio/mc \
    cors set "inova-catalog/$BUCKET" /tmp/cors.json 2>/dev/null \
    && echo "    CORS OK" \
    || echo "    Aviso: CORS falhou — upload multipart via API (T017) continua funcionando"
else
  mc_cmd cors set "inova-catalog/$BUCKET" "$CORS_FILE" 2>/dev/null \
    && echo "    CORS OK" \
    || echo "    Aviso: CORS falhou — upload multipart via API (T017) continua funcionando"
fi
rm -f "$CORS_FILE"

echo "==> OK — bucket $BUCKET pronto"
grep '^S3_ENDPOINT=' "$ENV_FILE" 2>/dev/null || true
echo "    Teste upload em /dashboard/catalogo (multipart T017)."
