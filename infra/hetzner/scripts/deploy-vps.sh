#!/usr/bin/env bash
# spec 013 T012 — build + deploy stack app na VPS (com ou sem npm no host)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
COMPOSE_FILE="$ROOT/infra/hetzner/docker-compose.app.yml"
ENV_FILE="$ROOT/infra/hetzner/.env.production"
EXAMPLE="$ROOT/infra/hetzner/.env.production.example"
INSTALL_SCRIPT="$ROOT/infra/hetzner/scripts/install-stack-deps.sh"

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

if [[ ! -d node_modules ]] || [[ ! -x node_modules/.bin/tsx ]]; then
  echo "==> node_modules ausente ou incompleto — instalando..."
  bash "$INSTALL_SCRIPT"
fi

echo "==> Stack app (Docker)..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d

echo "==> Aguardando serviços..."
sleep 20

echo "==> Smoke health..."
curl -sf "http://127.0.0.1:8792/health" && echo " api OK" || echo "Aviso: API ainda subindo"
curl -sf -o /dev/null -w "web login: %{http_code}\n" "http://127.0.0.1:3102/login" || true

if command -v npm >/dev/null 2>&1 && [[ -f scripts/smoke-health.mjs ]]; then
  API_BASE="${API_BASE:-http://127.0.0.1:8792}" npm run smoke:health || true
else
  curl -sf "http://127.0.0.1:8792/health/stack" | head -c 2000 || echo "Aviso: curl health/stack"
fi

echo "Stack app iniciado."
