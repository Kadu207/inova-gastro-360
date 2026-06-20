#!/usr/bin/env bash
# Sincroniza contexto da feature ativa para AGENTS.md (seção Active Feature).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "$SCRIPT_DIR/common.sh"

REPO_ROOT="$(get_repo_root)"
eval "$(get_feature_paths)"

MARKER_START="<!-- speckit:active-feature:start -->"
MARKER_END="<!-- speckit:active-feature:end -->"

FEATURE_BLOCK="## Feature ativa (Spec Kit)

${MARKER_START}
- **Diretório:** \`${FEATURE_DIR#$REPO_ROOT/}\`
- **Spec:** \`spec.md\` | **Plan:** \`plan.md\` | **Tasks:** \`tasks.md\`
- **Atualizado:** $(date -u +"%Y-%m-%dT%H:%M:%SZ")
${MARKER_END}"

AGENTS_FILE="$REPO_ROOT/AGENTS.md"

if [[ ! -f "$AGENTS_FILE" ]]; then
  echo "AGENTS.md não encontrado em $REPO_ROOT" >&2
  exit 1
fi

if grep -q "$MARKER_START" "$AGENTS_FILE"; then
  python3 - "$AGENTS_FILE" "$FEATURE_BLOCK" <<'PY'
import sys
path, block = sys.argv[1], sys.argv[2]
start = "<!-- speckit:active-feature:start -->"
end = "<!-- speckit:active-feature:end -->"
text = open(path, encoding="utf-8").read()
if start in text and end in text:
    pre, rest = text.split(start, 1)
    _, post = rest.split(end, 1)
    open(path, "w", encoding="utf-8").write(pre + block + post)
else:
    open(path, "a", encoding="utf-8").write("\n\n" + block + "\n")
PY
else
  printf '\n%s\n' "$FEATURE_BLOCK" >> "$AGENTS_FILE"
fi

echo "OK — contexto atualizado para ${FEATURE_DIR#$REPO_ROOT/}"
