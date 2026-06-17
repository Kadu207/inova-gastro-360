#!/usr/bin/env bash
# Cria filas Cloudflare necessárias ao messaging-bus (idempotente).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${ROOT}/apps/workers/messaging-bus"

create_queue() {
  local name="$1"
  local out
  if out=$(npx wrangler queues create "${name}" 2>&1); then
    echo "✓ Criada: ${name}"
    return 0
  fi
  if echo "${out}" | grep -qiE 'already exists|already been taken|Queue name is already'; then
    echo "✓ Já existe: ${name}"
    return 0
  fi
  echo "${out}" >&2
  return 1
}

echo "Provisionando filas Cloudflare..."
create_queue "inova-gastro-orders-events"
create_queue "inova-gastro-orders-dlq"
echo "OK — filas prontas."
