#!/usr/bin/env bash
# Aplica migrations Prisma na VPS (Docker — host sem npx/node).
# Usa MIGRATION_DATABASE_URL (role inova_gastro owner), NÃO inova_gastro_app.
# Uso: bash infra/hetzner/scripts/migrate-deploy-vps.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
ENV_FILE="$ROOT/infra/hetzner/.env.production"
# shellcheck source=lib/db-url-vps.sh
source "$ROOT/infra/hetzner/scripts/lib/db-url-vps.sh"

cd "$ROOT"

if ! grep -q '^MIGRATION_DATABASE_URL=' "$ENV_FILE" 2>/dev/null; then
  echo "==> MIGRATION_DATABASE_URL ausente — configurando a partir do backup..."
  bash "$ROOT/infra/hetzner/scripts/fix-migration-url-vps.sh"
fi

DB_URL="$(resolve_vps_migration_database_url "$ENV_FILE")"

if [[ "$DB_URL" == *inova_gastro_app* ]]; then
  echo "Erro: migrate deploy exige role inova_gastro (owner), não inova_gastro_app." >&2
  exit 1
fi

echo "==> Teste conexão Postgres (migration owner)..."
docker run --rm --network host postgres:16-alpine \
  psql "$DB_URL" -c 'SELECT current_user AS role' >/dev/null

echo "==> Recuperando migrations falhas (se houver)..."
FAILED="$(docker run --rm --network host postgres:16-alpine \
  psql "$DB_URL" -tAc "SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NULL AND rolled_back_at IS NULL ORDER BY started_at DESC LIMIT 1" 2>/dev/null | tr -d '[:space:]' || true)"

if [[ -n "$FAILED" ]]; then
  echo "    Resolve rolled-back: $FAILED"
  docker run --rm -v "$ROOT:/app" -w /app/packages/database --network host \
    -e DATABASE_URL="$DB_URL" \
    -e DATABASE_SSL_INSECURE=1 \
    -e NODE_TLS_REJECT_UNAUTHORIZED=0 \
    node:20-alpine sh -c "npx prisma migrate resolve --rolled-back $FAILED"
fi

echo "==> prisma migrate deploy (Docker)..."
docker run --rm -v "$ROOT:/app" -w /app --network host \
  -e DATABASE_URL="$DB_URL" \
  -e DATABASE_SSL_INSECURE=1 \
  -e NODE_TLS_REJECT_UNAUTHORIZED=0 \
  node:20-alpine sh -c "npm run db:generate && npm run db:migrate"

echo "==> Migrations aplicadas."
