#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOOKS="$ROOT/.git/hooks"

cat > "$HOOKS/pre-commit" << 'HOOK'
#!/usr/bin/env bash
exec "$(git rev-parse --show-toplevel)/tools/pre-commit.sh"
HOOK
chmod +x "$HOOKS/pre-commit"
echo "✓ pre-commit hook 설치: $HOOKS/pre-commit"

cat > "$HOOKS/commit-msg" << 'HOOK'
#!/usr/bin/env bash
exec npx --no-install commitlint --edit "$1"
HOOK
chmod +x "$HOOKS/commit-msg"
echo "✓ commit-msg hook 설치: $HOOKS/commit-msg"
