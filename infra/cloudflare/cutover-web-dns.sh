#!/usr/bin/env bash
# Remove DNS legado de inovagastro360 e redeploy do Worker web.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ZONE_ID="${CLOUDFLARE_ZONE_ID:-3052e83cf281f5afff66767fed6e0903}"
HOST="inovagastro360.inovatitech.com.br"

if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  echo "Defina CLOUDFLARE_API_TOKEN (escopo Zone.DNS.Edit)" >&2
  exit 1
fi

echo "==> Listando registros DNS de ${HOST}..."
IDS=$(curl -fsS -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records?name=${HOST}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(' '.join(r['id'] for r in d.get('result',[])))")

for id in $IDS; do
  echo "    Deletando ${id}..."
  curl -fsS -X DELETE -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
    "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records/${id}" >/dev/null
done

echo "==> Deploy web..."
cd "${ROOT_DIR}"
export NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-https://inovagastro360-api.inovatitech.com.br}"
export NEXT_PUBLIC_REALTIME_URL="${NEXT_PUBLIC_REALTIME_URL:-https://inovagastro360-rt.inovatitech.com.br}"
npm run deploy:web

echo "OK — teste: curl -I https://${HOST}/login"
