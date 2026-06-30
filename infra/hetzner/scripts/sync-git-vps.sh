#!/usr/bin/env bash
# Sincroniza o repositório na VPS com o remoto (resolve branches divergentes).
# Uso: bash infra/hetzner/scripts/sync-git-vps.sh [branch]
# Padrão: master
#
# Descarta commits locais na VPS — a fonte de verdade é o GitHub.
# Alterações locais não commitadas em arquivos rastreados também são perdidas.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
BRANCH="${1:-master}"

cd "$ROOT"

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  echo "Erro: $ROOT não é um repositório git."
  exit 1
fi

echo "==> Estado atual"
git status -sb
echo

LOCAL="$(git rev-parse HEAD 2>/dev/null || echo '?')"
git fetch origin "$BRANCH"
REMOTE="origin/$BRANCH"

if ! git rev-parse "$REMOTE" >/dev/null 2>&1; then
  echo "Erro: branch remota $REMOTE não encontrada."
  exit 1
fi

REMOTE_SHA="$(git rev-parse "$REMOTE")"

if [[ "$LOCAL" == "$REMOTE_SHA" ]]; then
  echo "==> Já sincronizado com $REMOTE ($REMOTE_SHA)"
  exit 0
fi

echo "==> Local:  $LOCAL ($(git log -1 --oneline HEAD 2>/dev/null || echo '?'))"
echo "==> Remoto: $REMOTE_SHA ($(git log -1 --oneline "$REMOTE"))"
echo
echo "==> git reset --hard $REMOTE (descarta commits locais na VPS)"
git reset --hard "$REMOTE"
git clean -fd --exclude=infra/hetzner/.env.production --exclude='*.local' 2>/dev/null || git clean -fd

echo
echo "==> Sincronizado: $(git rev-parse --short HEAD) — $(git log -1 --oneline)"
echo "Próximo passo: bash infra/hetzner/scripts/build-web-vps.sh"
