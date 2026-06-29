#!/usr/bin/env bash
# Reconecta cloudflared Swarm à rede do stack Inova após restart do container.
# Instalar: sudo cp infra/hetzner/scripts/tunnel-connect-inova.sh /usr/local/bin/
#           sudo chmod +x /usr/local/bin/tunnel-connect-inova.sh
# Cron (a cada 5 min): */5 * * * * /usr/local/bin/tunnel-connect-inova.sh

set -euo pipefail

CF=$(docker ps --format '{{.Names}}' | grep '^cloudflared_cloudflared' | head -1 || true)
NET=inova-gastro-360-app_inova_internal

if [[ -z "$CF" ]]; then
  exit 0
fi

if ! docker network inspect "$NET" &>/dev/null; then
  exit 0
fi

docker network connect "$NET" "$CF" 2>/dev/null || true
