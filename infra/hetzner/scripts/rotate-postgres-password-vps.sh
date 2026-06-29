#!/usr/bin/env bash
# Rotaciona senha do usuário Postgres inova_gastro (VPS spec 013).
# Uso: bash rotate-postgres-password-vps.sh
# Gera senha nova, ALTER USER, atualiza .env.production, recria api-gateway.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
ENV_FILE="$ROOT/infra/hetzner/.env.production"
PG_CONTAINER="${POSTGRES_CONTAINER:-inova-gastro-360-postgres}"

cd "$ROOT"

OLD_PW="$(docker exec "$PG_CONTAINER" printenv POSTGRES_PASSWORD)"
NEW_PW="${POSTGRES_PASSWORD_NEW:-$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)}"
NEW_PW_SQL="${NEW_PW//\'/\'\'}"

echo "==> ALTER USER inova_gastro em $PG_CONTAINER"
docker exec -e PGPASSWORD="$OLD_PW" "$PG_CONTAINER" \
  psql -U inova_gastro -d inova_gastro_360 -c "ALTER USER inova_gastro WITH PASSWORD '${NEW_PW_SQL}';"

echo "==> Atualizar POSTGRES_PASSWORD no container (recreate necessário na próxima manutenção)"
echo "    Por ora, Postgres aceita a senha nova via ALTER USER."

export POSTGRES_PASSWORD_NEW=""
# fix-env usa POSTGRES_PASSWORD do container — atualizar container env requer recreate postgres.
# Solução: escrever senha nova direto no .env
DB_URL="postgresql://inova_gastro:${NEW_PW}@host.docker.internal:5440/inova_gastro_360?sslmode=require"

sed -i "s|^DATABASE_URL=.*|DATABASE_URL=${DB_URL}|" "$ENV_FILE"
sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=${NEW_PW}|" "$ENV_FILE"

grep -q '^DATABASE_SSL_INSECURE=' "$ENV_FILE" || echo "DATABASE_SSL_INSECURE=1" >>"$ENV_FILE"

echo "==> .env.production atualizado (senhas mascaradas)"
grep -E '^(DATABASE_URL|POSTGRES_PASSWORD)=' "$ENV_FILE" | sed 's/=.*/=***/'

echo ""
echo "IMPORTANTE: atualize POSTGRES_PASSWORD no docker-compose.prod.yml / stack Postgres"
echo "            e recrie inova-gastro-360-postgres na próxima janela de manutenção."
echo ""
echo "==> Recriando api-gateway..."
bash "$ROOT/infra/hetzner/scripts/recreate-api-vps.sh"

echo ""
echo "Nova senha (guarde em cofre — não commitar):"
echo "$NEW_PW"
