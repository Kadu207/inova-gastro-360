#!/usr/bin/env bash
# db:generate + db:seed na VPS (Docker, --network host)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
ENV_FILE="$ROOT/infra/hetzner/.env.production"
CONTAINER="${POSTGRES_CONTAINER:-inova-gastro-360-postgres}"

cd "$ROOT"

PW="$(docker exec "$CONTAINER" printenv POSTGRES_PASSWORD)"
DB_URL="postgresql://inova_gastro:${PW}@127.0.0.1:5440/inova_gastro_360?sslmode=require"

# SEED_ADMIN_PASSWORD deve ser definido no ambiente ou no .env.production.
SEED_ADMIN_PASSWORD="${SEED_ADMIN_PASSWORD:?defina SEED_ADMIN_PASSWORD (não versionar senha)}"

echo "==> prisma generate + seed..."
docker run --rm -v "$ROOT:/app" -w /app --network host \
  -e DATABASE_URL="$DB_URL" \
  -e DATABASE_SSL_INSECURE=1 \
  -e NODE_TLS_REJECT_UNAUTHORIZED=0 \
  -e SEED_ADMIN_PASSWORD="$SEED_ADMIN_PASSWORD" \
  node:20-alpine sh -c "npm run db:generate && npm run db:seed"

echo "==> Seed concluído"
echo "Usuários: admin@inovagastro360.local (admin), superadmin@inovagastro360.local (super_admin)"
echo "Senha: definida via SEED_ADMIN_PASSWORD"
