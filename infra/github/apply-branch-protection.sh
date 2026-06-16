#!/usr/bin/env bash
# Aplica branch protection em master quando o plano GitHub permitir (Pro ou repo público).
set -euo pipefail

REPO="${1:-Kadu207/inova-gastro-360}"
BRANCH="${2:-master}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Aplicando branch protection em ${REPO}@${BRANCH}..."
if gh api \
  -X PUT \
  "repos/${REPO}/branches/${BRANCH}/protection" \
  --input "${SCRIPT_DIR}/branch-protection.json"; then
  echo "OK — branch protection ativa."
else
  echo ""
  echo "Falhou: repositório privado no plano Free não suporta branch protection via API."
  echo "Opções: GitHub Pro, tornar o repo público, ou configurar manualmente em Settings → Branches."
  exit 1
fi
