#!/usr/bin/env bash
# Spec 015 — Gera e aplica segredos de segurança em .env.production (nunca commitar valores).
# Uso na VPS:
#   bash infra/hetzner/scripts/configure-security-env-vps.sh
# Opcional: sobrescrever valores existentes (não-CHANGE_ME):
#   FORCE=1 bash infra/hetzner/scripts/configure-security-env-vps.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT/infra/hetzner/.env.production}"
FORCE="${FORCE:-0}"

if [[ ! -f "$ENV_FILE" ]]; then
  cp "$ROOT/infra/hetzner/.env.production.example" "$ENV_FILE"
  echo "==> Criado $ENV_FILE a partir do example"
fi

gen_secret() {
  openssl rand -base64 32 | tr -d '\n'
}

set_if_missing() {
  local key="$1"
  local val="$2"
  if grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
    local current
    current="$(grep "^${key}=" "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '"')"
    if [[ "$FORCE" == "1" ]] || [[ "$current" == CHANGE_ME* ]] || [[ -z "$current" ]]; then
      if grep -q "^${key}=" "$ENV_FILE"; then
        sed -i "s|^${key}=.*|${key}=\"${val}\"|" "$ENV_FILE"
      else
        echo "${key}=\"${val}\"" >>"$ENV_FILE"
      fi
      echo "  $key atualizado"
    else
      echo "  $key mantido (já definido)"
    fi
  else
    echo "${key}=\"${val}\"" >>"$ENV_FILE"
    echo "  $key adicionado"
  fi
}

JWT="$(gen_secret)"
OUTBOX="$(gen_secret)"
INTERNAL="$(gen_secret)"
SEED_PW="$(gen_secret | head -c 24)"

echo "==> Configurando segredos em $ENV_FILE"
set_if_missing JWT_SECRET "$JWT"
set_if_missing OUTBOX_FLUSH_SECRET "$OUTBOX"
set_if_missing INTERNAL_SHARED_SECRET "$INTERNAL"
set_if_missing SEED_ADMIN_PASSWORD "$SEED_PW"

if ! grep -q '^CORS_ALLOWED_ORIGINS=' "$ENV_FILE"; then
  echo 'CORS_ALLOWED_ORIGINS="https://inovagastro360.inovatitech.com.br"' >>"$ENV_FILE"
  echo "  CORS_ALLOWED_ORIGINS adicionado"
fi

echo ""
echo "==> OK — segredos configurados (valores NÃO exibidos)."
echo "    Próximos passos:"
echo "    1. bash infra/hetzner/scripts/migrate-deploy-vps.sh   # RLS + billing"
echo "    2. bash infra/hetzner/scripts/recreate-api-vps.sh"
echo "    3. export SMOKE_PASSWORD=\"\$(grep SEED_ADMIN_PASSWORD $ENV_FILE | cut -d= -f2 | tr -d '\"')\""
echo "    4. bash infra/hetzner/scripts/smoke-orders-vps.sh"
echo ""
echo "    Rotacionar senha admin demo (histórico git):"
echo "    NEW_PASSWORD='...' bash infra/hetzner/scripts/rotate-admin-password-vps.sh"
