#!/usr/bin/env bash
# Reinicia nginx-proxy do stack Inova Gastro 360.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
ENV_FILE="$ROOT/infra/hetzner/.env.production"
COMPOSE_FILE="$ROOT/infra/hetzner/docker-compose.app.yml"

cd "$ROOT"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Erro: $ENV_FILE não encontrado. Rode a partir de ~/inova-gastro-360"
  exit 1
fi

docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" restart nginx-proxy
echo "OK — nginx-proxy reiniciado."
