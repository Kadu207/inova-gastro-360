#!/usr/bin/env bash
# db:generate + db:seed na VPS (Docker, --network host)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
ENV_FILE="$ROOT/infra/hetzner/.env.production"
CONTAINER="${POSTGRES_CONTAINER:-inova-gastro-360-postgres}"

cd "$ROOT"

PW="$(docker exec "$CONTAINER" printenv POSTGRES_PASSWORD)"
DB_URL="postgresql://inova_gastro:${PW}@127.0.0.1:5440/inova_gastro_360?sslmode=require"

echo "==> prisma generate + seed..."
docker run --rm -v "$ROOT:/app" -w /app --network host \
  -e DATABASE_URL="$DB_URL" \
  node:20-alpine sh -c "npm run db:generate && npm run db:seed"

echo "==> Seed concluído"
echo "Login demo: admin@inovagastro360.local / InovaGastro360!"
