#!/usr/bin/env bash
# Corrige DATABASE_URL + POSTGRES_PASSWORD no .env.production do projeto (spec 013/014).
# Lê a senha do container inova-gastro-360-postgres — não commitar o .env.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
ENV_FILE="$ROOT/infra/hetzner/.env.production"
CONTAINER="${POSTGRES_CONTAINER:-inova-gastro-360-postgres}"

cd "$ROOT"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Erro: $ENV_FILE não existe."
  echo "  cp infra/hetzner/.env.production.example infra/hetzner/.env.production"
  exit 1
fi

if ! docker exec "$CONTAINER" printenv POSTGRES_PASSWORD >/dev/null 2>&1; then
  echo "Erro: container $CONTAINER não encontrado ou sem POSTGRES_PASSWORD"
  exit 1
fi

PW="$(docker exec "$CONTAINER" printenv POSTGRES_PASSWORD)"
DB_URL="postgresql://inova_gastro:${PW}@host.docker.internal:5440/inova_gastro_360?sslmode=require"

# Aviso se existir .env editado por engano na home
WRONG="$HOME/infra/hetzner/.env.production"
if [[ -f "$WRONG" && "$WRONG" != "$ENV_FILE" ]]; then
  echo "Aviso: existe também $WRONG (fora do repo) — docker compose NÃO usa esse arquivo."
fi

if grep -q '^DATABASE_URL=' "$ENV_FILE"; then
  sed -i "s|^DATABASE_URL=.*|DATABASE_URL=${DB_URL}|" "$ENV_FILE"
else
  echo "DATABASE_URL=${DB_URL}" >>"$ENV_FILE"
fi

if grep -q '^POSTGRES_PASSWORD=' "$ENV_FILE"; then
  sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=${PW}|" "$ENV_FILE"
else
  echo "POSTGRES_PASSWORD=${PW}" >>"$ENV_FILE"
fi

if [[ -n "${JWT_SECRET_NEW:-}" ]]; then
  if grep -q '^JWT_SECRET=' "$ENV_FILE"; then
    sed -i "s|^JWT_SECRET=.*|JWT_SECRET=${JWT_SECRET_NEW}|" "$ENV_FILE"
  else
    echo "JWT_SECRET=${JWT_SECRET_NEW}" >>"$ENV_FILE"
  fi
  echo "JWT_SECRET atualizado."
elif grep -qE '^JWT_SECRET=(change-me|CHANGE_ME)' "$ENV_FILE" 2>/dev/null; then
  echo "Aviso: JWT_SECRET ainda é placeholder. Defina:"
  echo "  JWT_SECRET_NEW='$(openssl rand -base64 32)' bash $0"
fi

echo "==> OK — $ENV_FILE"
grep -E '^(DATABASE_URL|JWT_SECRET|POSTGRES_PASSWORD)=' "$ENV_FILE" | sed 's/=.*/=***/'
echo ""
echo "Próximo:"
echo "  docker compose -f infra/hetzner/docker-compose.app.yml --env-file infra/hetzner/.env.production restart api-gateway"
echo "  bash infra/hetzner/scripts/smoke-db-vps.sh"
