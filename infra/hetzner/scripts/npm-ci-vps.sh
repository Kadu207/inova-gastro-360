#!/usr/bin/env bash
# npm ci na VPS via Docker (host sem npm). Use após git pull com deps novas.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$ROOT"

echo "==> npm ci (Docker)..."
docker run --rm -v "$ROOT:/app" -w /app node:20-alpine sh -c "npm ci"

DEPLOY_USER="${SUDO_USER:-${USER:-gestaoti}}"
if id -u "$DEPLOY_USER" &>/dev/null; then
  chown -R "$DEPLOY_USER:$DEPLOY_USER" "$ROOT/node_modules" 2>/dev/null || \
    sudo chown -R "$DEPLOY_USER:$DEPLOY_USER" "$ROOT/node_modules" 2>/dev/null || true
fi

if [[ -d node_modules/@aws-sdk/client-s3 ]]; then
  echo "==> OK — @aws-sdk/client-s3 instalado"
else
  echo "Erro: @aws-sdk/client-s3 ainda ausente após npm ci"
  exit 1
fi

echo "Próximo: docker compose restart api-gateway (com .env.production)"
