#!/usr/bin/env bash
# Recria api-gateway para carregar .env.production atualizado (restart NÃO recarrega env).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
ENV_FILE="$ROOT/infra/hetzner/.env.production"
COMPOSE_FILE="$ROOT/infra/hetzner/docker-compose.app.yml"

cd "$ROOT"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Erro: $ENV_FILE não encontrado"
  exit 1
fi

echo "==> Recriando api-gateway (env atualizado)..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --force-recreate api-gateway

sleep 4

echo "==> DATABASE_URL no container:"
docker exec inova-gastro-360-api printenv DATABASE_URL | sed 's/:\/\/inova_gastro:[^@]*@/:\/\/inova_gastro:***@/'

code=$(curl -sf -o /dev/null -w "%{http_code}" http://127.0.0.1:8792/health 2>/dev/null || echo "000")
echo "==> health: $code"

if echo "$(docker exec inova-gastro-360-api printenv DATABASE_URL 2>/dev/null)" | grep -q CHANGE_ME; then
  echo "ERRO: container ainda com CHANGE_ME — rode fix-env-db-url-vps.sh"
  exit 1
fi

echo "OK — teste login:"
echo '  curl -s -X POST https://inovagastro360.inovatitech.com.br/api/v1/auth/login -H "content-type: application/json" -d '"'"'{"email":"admin@inovagastro360.local","password":"InovaGastro360!"}'"'"
