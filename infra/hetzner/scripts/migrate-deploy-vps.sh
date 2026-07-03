#!/usr/bin/env bash
# Aplica migrations Prisma na VPS (Docker — host sem npx/node).
# Uso: bash infra/hetzner/scripts/migrate-deploy-vps.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
CONTAINER="${POSTGRES_CONTAINER:-inova-gastro-360-postgres}"

cd "$ROOT"

PW="$(docker exec "$CONTAINER" printenv POSTGRES_PASSWORD)"
DB_URL="postgresql://inova_gastro:${PW}@127.0.0.1:5440/inova_gastro_360?sslmode=require"

echo "==> prisma migrate deploy (Docker)..."
docker run --rm -v "$ROOT:/app" -w /app --network host \
  -e DATABASE_URL="$DB_URL" \
  -e DATABASE_SSL_INSECURE=1 \
  -e NODE_TLS_REJECT_UNAUTHORIZED=0 \
  node:20-alpine sh -c "npm run db:generate && npm run db:migrate"

echo "==> Migrations aplicadas."
