#!/usr/bin/env bash
# Spec 015 — Rotaciona a senha de um usuário (padrão: admin demo) direto no Postgres da VPS.
# Uso: NEW_PASSWORD='...' [ROTATE_EMAIL=admin@inovagastro360.local] bash rotate-admin-password-vps.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
CONTAINER="${POSTGRES_CONTAINER:-inova-gastro-360-postgres}"
EMAIL="${ROTATE_EMAIL:-admin@inovagastro360.local}"
NEW_PASSWORD="${NEW_PASSWORD:?defina NEW_PASSWORD com a nova senha (não versionar)}"

PW="$(docker exec "$CONTAINER" printenv POSTGRES_PASSWORD)"
DB_URL="postgresql://inova_gastro:${PW}@127.0.0.1:5440/inova_gastro_360?sslmode=require"

echo "==> Gerando hash bcrypt e atualizando ${EMAIL}..."
docker run --rm -v "$ROOT:/app" -w /app --network host \
  -e DATABASE_URL="$DB_URL" \
  -e DATABASE_SSL_INSECURE=1 \
  -e NODE_TLS_REJECT_UNAUTHORIZED=0 \
  -e ROTATE_EMAIL="$EMAIL" \
  -e NEW_PASSWORD="$NEW_PASSWORD" \
  node:20-alpine sh -c "node -e '
    const bcrypt = require(\"bcryptjs\");
    const pg = require(\"pg\");
    (async () => {
      const hash = await bcrypt.hash(process.env.NEW_PASSWORD, 12);
      const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
      await client.connect();
      const r = await client.query(
        \"UPDATE users SET password_hash = \$1, updated_at = NOW() WHERE email = \$2 RETURNING id\",
        [hash, process.env.ROTATE_EMAIL],
      );
      await client.query(\"DELETE FROM sessions WHERE user_id = ANY(\$1::uuid[])\", [r.rows.map((x) => x.id)]);
      console.log(\"Atualizado:\", r.rowCount, \"usuário(s); sessões revogadas.\");
      await client.end();
    })().catch((e) => { console.error(e); process.exit(1); });
  '"

echo "==> Senha rotacionada. Atualize SEED_ADMIN_PASSWORD/SMOKE_PASSWORD nos ambientes que usam."
