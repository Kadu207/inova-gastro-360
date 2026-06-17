#!/usr/bin/env bash
# Restringe Postgres (5440) aos IPs da Cloudflare para Hyperdrive.
set -euo pipefail

PORT="${1:-5440}"

if ! command -v ufw >/dev/null 2>&1; then
  echo "ufw não encontrado" >&2
  exit 1
fi

echo "Aplicando UFW: porta ${PORT} apenas para IPs Cloudflare..."
for cidr in $(curl -fsSL https://www.cloudflare.com/ips-v4); do
  ufw allow from "$cidr" to any port "$PORT" proto tcp comment "CF Hyperdrive" >/dev/null || true
done

ufw deny "$PORT/tcp" >/dev/null 2>&1 || true
ufw status numbered | grep -E "${PORT}|Cloudflare|CF Hyperdrive" || ufw status
