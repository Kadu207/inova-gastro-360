#!/usr/bin/env bash
# Testa conexão Postgres da VPS (host + URL do .env.production)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
ENV_FILE="$ROOT/infra/hetzner/.env.production"

cd "$ROOT"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Erro: $ENV_FILE não encontrado"
  exit 1
fi

set -a
# shellcheck disable=SC1090
source <(grep -E '^[A-Za-z_][A-Za-z0-9_]*=' "$ENV_FILE" | sed 's/\r$//')
set +a

echo "==> Postgres container"
docker ps --format '{{.Names}}\t{{.Status}}' | grep -i postgres || echo "    Aviso: container postgres não listado"

echo "==> Porta 5440 no host"
if ss -tlnp 2>/dev/null | grep -q ':5440'; then
  echo "    5440 listening OK"
else
  echo "    ERRO: nada escutando em 5440"
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "Erro: DATABASE_URL vazio em $ENV_FILE"
  exit 1
fi

if echo "$DATABASE_URL" | grep -q 'CHANGE_ME'; then
  echo "ERRO: DATABASE_URL ainda contém CHANGE_ME — use a senha real do Postgres"
  exit 1
fi

HOST_URL="${DATABASE_URL//host.docker.internal/127.0.0.1}"
# Postgres prod VPS usa SSL (docker-compose.prod.yml)
if [[ "$HOST_URL" != *sslmode=* ]]; then
  if [[ "$HOST_URL" == *'?'* ]]; then
    HOST_URL="${HOST_URL}&sslmode=require"
  else
    HOST_URL="${HOST_URL}?sslmode=require"
  fi
fi

echo "==> psql via host (127.0.0.1:5440)"
if docker run --rm --network host postgres:16-alpine \
  psql "$HOST_URL" -c 'SELECT 1 AS ok' 2>&1; then
  echo "    Conexão host OK"
else
  echo "    FALHOU — veja erro acima (senha, SSL ou Postgres parado)"
  echo ""
  echo "Dica: senha do container postgres:"
  echo "  docker exec inova-gastro-360-postgres printenv POSTGRES_PASSWORD"
  echo ""
  echo "DATABASE_URL esperado no .env (api-gateway Docker):"
  echo "  postgresql://inova_gastro:SENHA@host.docker.internal:5440/inova_gastro_360?sslmode=require"
  exit 1
fi

echo "==> login_error recente (api-gateway)"
docker logs inova-gastro-360-api --tail 15 2>&1 | grep -E 'login_error|Error|ECONNREFUSED|password' || echo "    (sem erros recentes nos logs)"

echo "==> Smoke DB OK"
