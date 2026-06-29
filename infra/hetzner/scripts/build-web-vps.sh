#!/usr/bin/env bash
# Rebuild static export (apps/web/out) na VPS — npm não está no host; usa container Node.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
ENV_FILE="$ROOT/infra/hetzner/.env.production"
COMPOSE_FILE="$ROOT/infra/hetzner/docker-compose.app.yml"

cd "$ROOT"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line#"${line%%[![:space:]]*}"}"
    [[ -z "$line" || "$line" =~ ^# ]] && continue
    [[ "$line" =~ ^[A-Za-z_][A-Za-z0-9_]*= ]] || continue
    export "$line"
  done < "$ENV_FILE"
  set +a
fi

API_URL="${NEXT_PUBLIC_API_URL:-https://inovagastro360.inovatitech.com.br}"
RT_URL="${NEXT_PUBLIC_REALTIME_URL:-https://inovagastro360.inovatitech.com.br}"

echo "==> Build web (Docker)..."
if [[ ! -d node_modules ]] || [[ ! -x node_modules/.bin/next ]]; then
  echo "    node_modules ausente — npm ci primeiro (pode demorar)..."
  docker run --rm -v "$ROOT:/app" -w /app node:20-alpine sh -c "npm ci"
fi

docker run --rm -v "$ROOT:/app" -w /app \
  -e NEXT_PUBLIC_API_URL="$API_URL" \
  -e NEXT_PUBLIC_REALTIME_URL="$RT_URL" \
  node:20-alpine sh -c "npm run build -w @inova-gastro-360/web"

DEPLOY_USER="${SUDO_USER:-${USER:-gestaoti}}"
if id -u "$DEPLOY_USER" &>/dev/null; then
  chown -R "$DEPLOY_USER:$DEPLOY_USER" "$ROOT/apps/web/out" "$ROOT/apps/web/.next" 2>/dev/null || \
    sudo chown -R "$DEPLOY_USER:$DEPLOY_USER" "$ROOT/apps/web/out" "$ROOT/apps/web/.next" 2>/dev/null || true
  # npm ci/build via Docker cria arquivos como root — evita crash dos containers Node
  chown -R "$DEPLOY_USER:$DEPLOY_USER" "$ROOT/node_modules" 2>/dev/null || \
    sudo chown -R "$DEPLOY_USER:$DEPLOY_USER" "$ROOT/node_modules" 2>/dev/null || true
fi

echo "==> Reiniciando web + api-gateway + nginx (re-resolve DNS)..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --force-recreate web
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d api-gateway
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --force-recreate nginx-proxy

echo "==> Aguardando web (serve)..."
for i in 1 2 3 4 5 6 7 8 9 10; do
  if curl -sf -o /dev/null "http://127.0.0.1:9088/cardapio" 2>/dev/null; then
    break
  fi
  sleep 2
done

/usr/local/bin/tunnel-connect-inova.sh 2>/dev/null || bash "$ROOT/infra/hetzner/scripts/tunnel-connect-inova.sh" 2>/dev/null || true

echo "==> Smoke local..."
grep -q 'catalog-page' "$ROOT/apps/web/out/cardapio.html" 2>/dev/null && echo "    out/cardapio.html: catalog-page OK" || echo "Aviso: catalog-page não encontrado em out/"
curl -sf -o /dev/null -w "    local :9088: %{http_code}\n" "http://127.0.0.1:9088/cardapio" || echo "Aviso: local :9088 indisponível"
curl -sf -o /dev/null -w "    cardapio HTTPS: %{http_code}\n" "https://inovagastro360.inovatitech.com.br/cardapio" || echo "Aviso: HTTPS indisponível — rode tunnel-connect-inova.sh"

echo "Build web concluído."
