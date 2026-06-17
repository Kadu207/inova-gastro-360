#!/usr/bin/env bash
# Provisiona Postgres na VPS para Hyperdrive (produção).
# Uso local: ./provision-vps-postgres.sh [user@host]
set -euo pipefail

REMOTE="${1:-root@128.140.77.31}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"

if [[ -z "${POSTGRES_PASSWORD:-}" || -z "${HYPERDRIVE_DB_PASSWORD:-}" ]]; then
  echo "Defina POSTGRES_PASSWORD e HYPERDRIVE_DB_PASSWORD no ambiente." >&2
  exit 1
fi

REMOTE_DIR="/opt/inova-gastro-360"

echo "==> Criando diretório na VPS..."
ssh "$REMOTE" "mkdir -p ${REMOTE_DIR}/infra/hetzner/scripts"

echo "==> Enviando compose..."
scp "$ROOT_DIR/infra/hetzner/docker-compose.prod.yml" "$REMOTE:${REMOTE_DIR}/docker-compose.prod.yml"
scp "$SCRIPT_DIR/allow-cloudflare-postgres.sh" "$REMOTE:${REMOTE_DIR}/infra/hetzner/scripts/"

echo "==> Subindo Postgres..."
ssh "$REMOTE" bash -s <<REMOTE_EOF
set -euo pipefail
cd ${REMOTE_DIR}
cat > .env <<ENV_EOF
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
ENV_EOF
chmod 600 .env
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml ps
REMOTE_EOF

echo "==> Usuário inova_hyperdrive..."
SQL=$(cat <<SQL_EOF
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'inova_hyperdrive') THEN
    CREATE USER inova_hyperdrive WITH PASSWORD '${HYPERDRIVE_DB_PASSWORD}';
  ELSE
    ALTER USER inova_hyperdrive WITH PASSWORD '${HYPERDRIVE_DB_PASSWORD}';
  END IF;
END
\$\$;
GRANT CONNECT ON DATABASE inova_gastro_360 TO inova_hyperdrive;
GRANT USAGE ON SCHEMA public TO inova_hyperdrive;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO inova_hyperdrive;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO inova_hyperdrive;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO inova_hyperdrive;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO inova_hyperdrive;
SQL_EOF
)

ssh "$REMOTE" "docker exec -i inova-gastro-360-postgres psql -U inova_gastro -d inova_gastro_360" <<< "$SQL"

echo "==> Firewall Cloudflare na porta 5440..."
ssh "$REMOTE" "bash ${REMOTE_DIR}/infra/hetzner/scripts/allow-cloudflare-postgres.sh 5440"

echo "OK — Postgres na VPS. Rode migrations do PC:"
echo "  DATABASE_URL=postgresql://inova_gastro:\$POSTGRES_PASSWORD@128.140.77.31:5440/inova_gastro_360 npm run db:migrate"
echo "  DATABASE_URL=... npm run db:seed"
