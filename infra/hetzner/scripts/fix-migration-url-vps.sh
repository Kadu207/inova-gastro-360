#!/usr/bin/env bash
# Grava MIGRATION_DATABASE_URL (inova_gastro owner) a partir do backup do .env ou URL atual.
# Mantém DATABASE_URL da API (inova_gastro_app). Rode antes de migrate-deploy se T053 já foi aplicado.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
ENV_FILE="$ROOT/infra/hetzner/.env.production"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Erro: $ENV_FILE não encontrado"
  exit 1
fi

CURRENT="$(grep '^DATABASE_URL=' "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'")"
MIGRATION="${MIGRATION_DATABASE_URL:-}"

if [[ -z "$MIGRATION" ]]; then
  if grep -q '^MIGRATION_DATABASE_URL=' "$ENV_FILE"; then
    MIGRATION="$(grep '^MIGRATION_DATABASE_URL=' "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'")"
  fi
fi

if [[ -z "$MIGRATION" || "$MIGRATION" == *inova_gastro_app* ]]; then
  BAK="$(ls -t "${ENV_FILE}.bak."* 2>/dev/null | head -1 || true)"
  if [[ -n "$BAK" ]]; then
    MIGRATION="$(grep '^DATABASE_URL=' "$BAK" | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'")"
    echo "==> Origem: backup $(basename "$BAK")"
  elif [[ "$CURRENT" != *inova_gastro_app* ]]; then
    MIGRATION="$CURRENT"
    echo "==> Origem: DATABASE_URL atual (ainda inova_gastro)"
  fi
fi

if [[ -z "$MIGRATION" || "$MIGRATION" == *inova_gastro_app* || "$MIGRATION" == *CHANGE_ME* ]]; then
  echo "Erro: não foi possível derivar URL de migration (inova_gastro)."
  echo "Defina manualmente:"
  echo "  MIGRATION_DATABASE_URL='postgresql://inova_gastro:SENHA@host.docker.internal:5440/inova_gastro_360?sslmode=require'"
  exit 1
fi

if grep -q '^MIGRATION_DATABASE_URL=' "$ENV_FILE"; then
  sed -i "s|^MIGRATION_DATABASE_URL=.*|MIGRATION_DATABASE_URL=\"${MIGRATION}\"|" "$ENV_FILE"
else
  echo "MIGRATION_DATABASE_URL=\"${MIGRATION}\"" >>"$ENV_FILE"
fi

echo "==> OK — MIGRATION_DATABASE_URL configurada (owner inova_gastro)"
grep -E '^(DATABASE_URL|MIGRATION_DATABASE_URL)=' "$ENV_FILE" | sed 's/=.*inova_gastro_app:[^@]*/=***inova_gastro_app:***/' | sed 's/=.*inova_gastro:[^@]*/=***inova_gastro:***/'
echo ""
echo "Próximo:"
echo "  bash infra/hetzner/scripts/migrate-deploy-vps.sh"
