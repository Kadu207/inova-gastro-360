#!/usr/bin/env bash
# Aplica migrations Prisma na VPS (Docker — host sem npx/node).
# Usa DATABASE_URL de infra/hetzner/.env.production (user inova_gastro).
# Uso: bash infra/hetzner/scripts/migrate-deploy-vps.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
ENV_FILE="$ROOT/infra/hetzner/.env.production"
# shellcheck source=lib/db-url-vps.sh
source "$ROOT/infra/hetzner/scripts/lib/db-url-vps.sh"

cd "$ROOT"

DB_URL="$(resolve_vps_host_database_url "$ENV_FILE")"

echo "==> Teste conexão Postgres (host)..."
docker run --rm --network host postgres:16-alpine \
  psql "$DB_URL" -c 'SELECT 1 AS ok' >/dev/null

echo "==> prisma migrate deploy (Docker)..."
docker run --rm -v "$ROOT:/app" -w /app --network host \
  -e DATABASE_URL="$DB_URL" \
  -e DATABASE_SSL_INSECURE=1 \
  -e NODE_TLS_REJECT_UNAUTHORIZED=0 \
  node:20-alpine sh -c "npm run db:generate && npm run db:migrate"

echo "==> Migrations aplicadas."
