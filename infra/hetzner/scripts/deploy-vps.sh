#!/usr/bin/env bash
# spec 013 T012 — build + deploy stack app na VPS (com ou sem npm no host)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
COMPOSE_FILE="$ROOT/infra/hetzner/docker-compose.app.yml"
ENV_FILE="$ROOT/infra/hetzner/.env.production"
EXAMPLE="$ROOT/infra/hetzner/.env.production.example"

if [[ ! -f "$ENV_FILE" ]]; then
  if [[ -f "$EXAMPLE" ]]; then
    echo "Crie $ENV_FILE a partir de:"
    echo "  cp $EXAMPLE $ENV_FILE"
  else
    echo "Arquivo não encontrado: $ENV_FILE"
    echo "Execute este script na raiz do repositório clonado (git clone)."
  fi
  exit 1
fi

# Carrega só linhas KEY=VALUE (ignora comentários e linhas decorativas)
set -a
while IFS= read -r line || [[ -n "$line" ]]; do
  line="${line#"${line%%[![:space:]]*}"}"
  [[ -z "$line" || "$line" =~ ^# ]] && continue
  [[ "$line" =~ ^[A-Za-z_][A-Za-z0-9_]*= ]] || continue
  export "$line"
done < "$ENV_FILE"
set +a

# Migrate no host: 127.0.0.1 (Postgres já provisionado em /opt ou local :5440)
MIGRATE_DATABASE_URL="${DATABASE_URL//host.docker.internal/127.0.0.1}"

run_npm() {
  if command -v npm >/dev/null 2>&1; then
    npm "$@"
  else
    echo "==> npm não encontrado no host — usando container node:20-alpine"
    docker run --rm -v "$ROOT:/app" -w /app --network host \
      -e DATABASE_URL="$MIGRATE_DATABASE_URL" \
      node:20-alpine sh -c "npm ci && npm $*"
  fi
}

cd "$ROOT"

if docker ps --format '{{.Names}}' | grep -q '^inova-gastro-360-postgres$'; then
  echo "==> Postgres já em execução (inova-gastro-360-postgres) — pulando compose prod"
else
  echo "==> Subindo Postgres (primeira vez)..."
  docker compose -f "$ROOT/infra/hetzner/docker-compose.prod.yml" --env-file "$ENV_FILE" up -d
  sleep 5
fi

echo "==> Migrations..."
if command -v npm >/dev/null 2>&1; then
  DATABASE_URL="$MIGRATE_DATABASE_URL" npm ci
  DATABASE_URL="$MIGRATE_DATABASE_URL" npm run db:migrate
else
  docker run --rm -v "$ROOT:/app" -w /app --network host \
    -e DATABASE_URL="$MIGRATE_DATABASE_URL" \
    node:20-alpine sh -c "npm ci && npm run db:migrate"
fi

echo "==> Stack app (Docker)..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build 2>/dev/null || true
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d

echo "==> Aguardando serviços..."
sleep 15

echo "==> Smoke health..."
if command -v npm >/dev/null 2>&1; then
  API_BASE="${API_BASE:-http://127.0.0.1:8792}" npm run smoke:health || true
else
  curl -sf "http://127.0.0.1:8792/health/stack" | head -c 2000 || echo "Aviso: API ainda subindo — tente: curl http://127.0.0.1:8792/health/stack"
fi

echo "Stack app iniciado."
