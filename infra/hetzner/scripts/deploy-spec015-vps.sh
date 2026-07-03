#!/usr/bin/env bash
# Spec 015 — deploy completo na VPS (segurança + migrate + rebuild + smoke).
#
# Pré-requisitos:
#   - Branch feat/015-security-hardening checked out
#   - NEW_PASSWORD e SMOKE_PASSWORD definidos (mesma senha após rotate)
#
# Uso:
#   NEW_PASSWORD='...' SMOKE_PASSWORD='...' bash infra/hetzner/scripts/deploy-spec015-vps.sh
#
# Opcional RLS role:
#   APP_DB_PASSWORD='...' (export antes ou passado junto)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$ROOT"

NEW_PASSWORD="${NEW_PASSWORD:?defina NEW_PASSWORD (senha nova do admin demo)}"
SMOKE_PASSWORD="${SMOKE_PASSWORD:-$NEW_PASSWORD}"
export SMOKE_PASSWORD

echo "==> [1/8] Teste conexão DB"
bash infra/hetzner/scripts/smoke-db-vps.sh

echo "==> [2/8] Segredos (.env.production)"
bash infra/hetzner/scripts/configure-security-env-vps.sh

echo "==> [3/8] Migrations (RLS + billing)"
bash infra/hetzner/scripts/migrate-deploy-vps.sh

echo "==> [4/8] Rotacionar senha admin"
NEW_PASSWORD="$NEW_PASSWORD" bash infra/hetzner/scripts/rotate-admin-password-vps.sh

if [[ -n "${APP_DB_PASSWORD:-}" ]]; then
  echo "==> [5/8] Role inova_gastro_app (RLS)"
  APP_DB_PASSWORD="$APP_DB_PASSWORD" bash infra/hetzner/scripts/setup-app-db-role-vps.sh
else
  echo "==> [5/8] Pulando setup-app-db-role (defina APP_DB_PASSWORD para RLS defense-in-depth)"
fi

echo "==> [6/8] npm ci + build web"
bash infra/hetzner/scripts/npm-ci-vps.sh
bash infra/hetzner/scripts/build-web-vps.sh

echo "==> [7/8] Recriar api-gateway"
bash infra/hetzner/scripts/recreate-api-vps.sh

echo "==> [8/8] Smokes"
bash infra/hetzner/scripts/smoke-orders-vps.sh
bash infra/hetzner/scripts/smoke-catalog-upload.sh

echo ""
echo "==> Deploy spec 015 concluído."
