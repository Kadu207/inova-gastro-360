#!/usr/bin/env bash
# Configura secrets do GitHub com os NOMES que o deploy.yml espera.
# Uso: ./infra/github/set-cloudflare-secrets.sh
set -euo pipefail

REPO="Kadu207/inova-gastro-360"

echo "=============================================="
echo " Secrets Cloudflare → GitHub Actions"
echo " Repositório: ${REPO}"
echo "=============================================="
echo ""
echo "IMPORTANTE:"
echo "  • NOME do secret 1: CLOUDFLARE_API_TOKEN"
echo "  • VALOR: cole o token do Cloudflare (começa com cfat_...)"
echo ""
echo "  • NOME do secret 2: CLOUDFLARE_ACCOUNT_ID"
echo "  • VALOR: cole o Account ID (32 caracteres hex)"
echo ""
echo "NÃO use o token nem o Account ID como NOME do secret!"
echo ""

read -r -p "Pressione Enter para configurar CLOUDFLARE_API_TOKEN... "
gh secret set CLOUDFLARE_API_TOKEN -R "${REPO}"
echo "✓ CLOUDFLARE_API_TOKEN gravado"
echo ""

read -r -p "Pressione Enter para configurar CLOUDFLARE_ACCOUNT_ID... "
gh secret set CLOUDFLARE_ACCOUNT_ID -R "${REPO}"
echo "✓ CLOUDFLARE_ACCOUNT_ID gravado"
echo ""

echo "Secrets atuais:"
gh secret list -R "${REPO}"
echo ""
if gh secret list -R "${REPO}" | grep -q '^CLOUDFLARE_API_TOKEN'; then
  if gh secret list -R "${REPO}" | grep -q '^CLOUDFLARE_ACCOUNT_ID'; then
    echo "OK — os dois secrets corretos estão configurados."
    echo "Próximo passo:"
    echo "  gh workflow run deploy.yml -R ${REPO} --ref master -f environment=production"
    exit 0
  fi
fi
echo "ERRO — faltam secrets. Rode o script novamente."
exit 1
