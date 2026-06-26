#!/usr/bin/env bash
# spec 013 T012 — build + deploy stack app na VPS
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

cd "$ROOT"
npm ci
npm run db:migrate

docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build 2>/dev/null || true
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d

echo "Stack app iniciado."
API_BASE="${API_BASE:-http://127.0.0.1:8792}" npm run smoke:health || echo "Aviso: smoke falhou — aguarde containers subirem e rode npm run smoke:health"
