#!/usr/bin/env bash
# T027 — prepara .env.production para Cloudflare R2 (swap MinIO → R2).
# Não migra objetos existentes; ver infra/hetzner/docs/R2-STORAGE.md
#
# Uso (exporte antes ou passe inline):
#   R2_ACCOUNT_ID=... R2_ACCESS_KEY_ID=... R2_SECRET_ACCESS_KEY=... \
#   R2_BUCKET=inova-gastro-360 R2_PUBLIC_BASE_URL=https://media.inovagastro360.inovatitech.com.br \
#   bash infra/hetzner/scripts/configure-r2-env-vps.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
ENV_FILE="$ROOT/infra/hetzner/.env.production"

ACCOUNT_ID="${R2_ACCOUNT_ID:-}"
ACCESS_KEY="${R2_ACCESS_KEY_ID:-}"
SECRET_KEY="${R2_SECRET_ACCESS_KEY:-}"
BUCKET="${R2_BUCKET:-inova-gastro-360}"
PUBLIC_URL="${R2_PUBLIC_BASE_URL:-}"

cd "$ROOT"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Erro: $ENV_FILE não encontrado"
  exit 1
fi

missing=()
[[ -z "$ACCOUNT_ID" ]] && missing+=("R2_ACCOUNT_ID")
[[ -z "$ACCESS_KEY" ]] && missing+=("R2_ACCESS_KEY_ID")
[[ -z "$SECRET_KEY" ]] && missing+=("R2_SECRET_ACCESS_KEY")
[[ -z "$PUBLIC_URL" ]] && missing+=("R2_PUBLIC_BASE_URL")

if [[ ${#missing[@]} -gt 0 ]]; then
  echo "Erro: variáveis obrigatórias ausentes: ${missing[*]}"
  echo ""
  echo "Exemplo:"
  echo "  R2_ACCOUNT_ID=abc123 \\"
  echo "  R2_ACCESS_KEY_ID=... \\"
  echo "  R2_SECRET_ACCESS_KEY=... \\"
  echo "  R2_PUBLIC_BASE_URL=https://media.inovagastro360.inovatitech.com.br \\"
  echo "  bash $0"
  exit 1
fi

S3_ENDPOINT="https://${ACCOUNT_ID}.r2.cloudflarestorage.com"

set_or_replace() {
  local key="$1"
  local val="$2"
  if grep -q "^${key}=" "$ENV_FILE"; then
    sed -i "s|^${key}=.*|${key}=${val}|" "$ENV_FILE"
  else
    echo "${key}=${val}" >>"$ENV_FILE"
  fi
}

echo "==> Configurando R2 em $ENV_FILE"
set_or_replace STORAGE_PROVIDER r2
set_or_replace S3_ENDPOINT "$S3_ENDPOINT"
set_or_replace S3_REGION auto
set_or_replace S3_BUCKET "$BUCKET"
set_or_replace S3_ACCESS_KEY "$ACCESS_KEY"
set_or_replace S3_SECRET_KEY "$SECRET_KEY"
set_or_replace S3_PUBLIC_BASE_URL "$PUBLIC_URL"

# MinIO-specific — comentar referência (api ignora se R2 ok)
if grep -q '^MINIO_CONTAINER=' "$ENV_FILE"; then
  sed -i 's/^MINIO_CONTAINER=/#MINIO_CONTAINER=/' "$ENV_FILE" || true
fi

echo "    STORAGE_PROVIDER=r2"
echo "    S3_ENDPOINT=$S3_ENDPOINT"
echo "    S3_PUBLIC_BASE_URL=$PUBLIC_URL"
grep -E '^S3_' "$ENV_FILE" | sed 's/SECRET_KEY=.*/SECRET_KEY=***/'

echo ""
echo "Próximo (ver docs/R2-STORAGE.md):"
echo "  1. Custom domain R2 no Cloudflare + CORS"
echo "  2. (Opcional) mc mirror MinIO → R2 para fotos existentes"
echo "  3. bash infra/hetzner/scripts/recreate-api-vps.sh"
echo "  4. bash infra/hetzner/scripts/smoke-catalog-upload.sh"
