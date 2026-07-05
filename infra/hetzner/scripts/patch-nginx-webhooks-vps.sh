#!/usr/bin/env bash
# Adiciona location /webhooks/ no nginx Docker (spec 007) se ainda não existir.
# Uso: cd ~/inova-gastro-360 && bash infra/hetzner/scripts/patch-nginx-webhooks-vps.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
CONF="$ROOT/infra/hetzner/nginx/inovagastro360.docker.conf"
ENV_FILE="$ROOT/infra/hetzner/.env.production"
COMPOSE_FILE="$ROOT/infra/hetzner/docker-compose.app.yml"

cd "$ROOT"

if [[ ! -f "$CONF" ]]; then
  echo "Erro: $CONF não encontrado"
  exit 1
fi

if grep -q 'location /webhooks/' "$CONF"; then
  echo "OK — location /webhooks/ já existe em $CONF"
else
  echo "==> Inserindo location /webhooks/ ..."
  cp "$CONF" "${CONF}.bak.$(date +%Y%m%d%H%M%S)"
  awk '
    /location \/api\// && !done {
      print "  location /webhooks/ {"
      print "    set $upstream_int integrations:8791;"
      print "    proxy_pass http://$upstream_int;"
      print "    proxy_http_version 1.1;"
      print "    proxy_set_header Host $host;"
      print "    proxy_set_header X-Real-IP $remote_addr;"
      print "    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;"
      print "    proxy_set_header X-Forwarded-Proto $scheme;"
      print "  }"
      print ""
      done=1
    }
    { print }
  ' "$CONF" > "${CONF}.tmp" && mv "${CONF}.tmp" "$CONF"
  echo "Patch aplicado."
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Aviso: $ENV_FILE não encontrado — só nginx será reiniciado se o stack existir."
fi

echo "==> Reiniciando nginx-proxy..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" restart nginx-proxy 2>/dev/null \
  || docker compose -f "$COMPOSE_FILE" restart nginx-proxy

sleep 2

code=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  "http://127.0.0.1:9088/webhooks/mercadopago" \
  -H "content-type: application/json" -d '{}' || echo "000")

echo "Teste local POST /webhooks/mercadopago → HTTP $code"
if [[ "$code" == "404" ]]; then
  echo "Ainda 404 — verifique: docker ps | grep nginx; docker logs inova-gastro-360-nginx --tail 20"
  exit 1
fi

echo "OK — nginx roteando webhooks para integrations (esperado 401 ou 400)."
