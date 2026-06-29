#!/usr/bin/env bash
# T021 — bucket MinIO para fotos do catálogo (spec 014)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
ENV_FILE="$ROOT/infra/hetzner/.env.production"
BUCKET="${S3_BUCKET:-inova-gastro-360}"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source <(grep -E '^[A-Za-z_][A-Za-z0-9_]*=' "$ENV_FILE" | sed 's/\r$//')
  set +a
fi

MINIO_ENDPOINT="${MINIO_HOST_ENDPOINT:-${S3_ENDPOINT:-http://127.0.0.1:9000}}"
MINIO_USER="${S3_ACCESS_KEY:-${MINIO_ROOT_USER:-}}"
MINIO_PASS="${S3_SECRET_KEY:-${MINIO_ROOT_PASSWORD:-}}"

if [[ "$MINIO_USER" == "CHANGE_ME" || "$MINIO_PASS" == "CHANGE_ME" || -z "$MINIO_USER" || -z "$MINIO_PASS" ]]; then
  echo "Erro: credenciais MinIO inválidas em $ENV_FILE"
  echo "  Defina S3_ACCESS_KEY e S3_SECRET_KEY com as credenciais reais do MinIO da VPS."
  echo "  Ou exporte MINIO_ROOT_USER / MINIO_ROOT_PASSWORD antes de rodar o script."
  echo ""
  echo "Descobrir MinIO na VPS:"
  echo "  docker ps --format '{{.Names}}' | grep -i minio"
  echo "  ss -tlnp | grep 9000"
  exit 1
fi

if ! command -v mc >/dev/null 2>&1; then
  echo "Instale MinIO Client (mc): https://min.io/docs/minio/linux/reference/minio-mc.html"
  exit 1
fi

# Host Docker: minio:9000 → localhost se script roda no host
LOCAL_ENDPOINT="$MINIO_ENDPOINT"
LOCAL_ENDPOINT="${LOCAL_ENDPOINT/minio:9000/127.0.0.1:9000}"

echo "==> Alias MinIO ($LOCAL_ENDPOINT)"
mc alias set inova-catalog "$LOCAL_ENDPOINT" "$MINIO_USER" "$MINIO_PASS"

echo "==> Testar conexão"
if ! mc ls inova-catalog >/dev/null 2>&1; then
  echo "Erro: não foi possível listar buckets em $LOCAL_ENDPOINT"
  echo "  Verifique se MinIO está rodando e se a porta/host estão corretos."
  echo "  Ex.: MINIO_HOST_ENDPOINT=http://127.0.0.1:9001 bash $0"
  exit 1
fi

echo "==> Bucket $BUCKET"
mc mb "inova-catalog/$BUCKET" --ignore-existing

echo "==> Leitura pública prefixo tenants/"
mc anonymous set download "inova-catalog/$BUCKET/tenants" || true

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
mc cors set "inova-catalog/$BUCKET" "$CORS_FILE" 2>/dev/null || echo "Aviso: mc cors set falhou — use fallback multipart (T017)"
rm -f "$CORS_FILE"

echo "==> OK — bucket $BUCKET pronto"
echo "    api-gateway usa S3_ENDPOINT=http://minio:9000 (rede Docker)"
echo "    S3_PUBLIC_BASE_URL deve apontar para CDN/nginx do prefixo tenants/"
