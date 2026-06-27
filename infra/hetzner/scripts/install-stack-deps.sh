#!/usr/bin/env bash
# Instala deps UMA vez (evita corrupção por npm ci paralelo nos containers)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
ENV_FILE="$ROOT/infra/hetzner/.env.production"
COMPOSE_FILE="$ROOT/infra/hetzner/docker-compose.app.yml"

cd "$ROOT"

echo "==> Parando stack app (se rodando)..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down 2>/dev/null || true

echo "==> Limpando node_modules corrompidos..."
rm -rf node_modules apps/web/node_modules apps/web/.next apps/web/out
find apps/workers packages -name node_modules -type d -prune -exec rm -rf {} + 2>/dev/null || true

if [[ -f "$ENV_FILE" ]]; then
  set -a
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line#"${line%%[![:space:]]*}"}"
    [[ -z "$line" || "$line" =~ ^# ]] && continue
    [[ "$line" =~ ^[A-Za-z_][A-Za-z0-9_]*= ]] || continue
    export "$line"
  done < "$ENV_FILE"
  set +a
fi

MIGRATE_URL="${DATABASE_URL:-postgresql://inova_gastro@127.0.0.1:5440/inova_gastro_360?schema=public}"
MIGRATE_URL="${MIGRATE_URL//host.docker.internal/127.0.0.1}"

echo "==> npm ci + prisma generate (container único)..."
docker run --rm -v "$ROOT:/app" -w /app --network host \
  -e DATABASE_URL="$MIGRATE_URL" \
  -e NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-https://inovagastro360.inovatitech.com.br}" \
  -e NEXT_PUBLIC_REALTIME_URL="${NEXT_PUBLIC_REALTIME_URL:-https://inovagastro360.inovatitech.com.br}" \
  node:20-alpine sh -c "
    npm ci &&
    npm run db:generate &&
    npm run db:migrate &&
    npm run db:seed &&
    npm run build -w @inova-gastro-360/web
  "

echo "==> Dependências instaladas. Suba o stack: bash infra/hetzner/scripts/deploy-vps.sh"
