#!/usr/bin/env bash
# Spec 015 T053 — Ativa role inova_gastro_app com senha e opcionalmente aponta DATABASE_URL da API.
# Uso: APP_DB_PASSWORD='...' bash infra/hetzner/scripts/setup-app-db-role-vps.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT/infra/hetzner/.env.production}"
CONTAINER="${POSTGRES_CONTAINER:-inova-gastro-360-postgres}"
APP_DB_PASSWORD="${APP_DB_PASSWORD:?defina APP_DB_PASSWORD (não versionar)}"

PW="$(docker exec "$CONTAINER" printenv POSTGRES_PASSWORD)"
DB="inova_gastro_360"

echo "==> Configurando role inova_gastro_app (RLS defense-in-depth)..."
docker exec -i "$CONTAINER" psql -U inova_gastro -d "$DB" <<SQL
ALTER ROLE inova_gastro_app WITH LOGIN PASSWORD '${APP_DB_PASSWORD}';
SQL

APP_URL="postgresql://inova_gastro_app:${APP_DB_PASSWORD}@host.docker.internal:5440/${DB}?sslmode=require"

if [[ -f "$ENV_FILE" ]]; then
  if grep -q '^DATABASE_URL=' "$ENV_FILE"; then
    cp "$ENV_FILE" "${ENV_FILE}.bak.$(date +%Y%m%d%H%M%S)"
    sed -i "s|^DATABASE_URL=.*|DATABASE_URL=\"${APP_URL}\"|" "$ENV_FILE"
    echo "==> DATABASE_URL atualizado para inova_gastro_app em $ENV_FILE"
    echo "    Backup: ${ENV_FILE}.bak.*"
  fi
fi

echo "==> Role configurada. Aplique migrations e recrie o api-gateway:"
echo "    bash infra/hetzner/scripts/migrate-deploy-vps.sh"
echo "    bash infra/hetzner/scripts/recreate-api-vps.sh"
