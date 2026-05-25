#!/usr/bin/env bash
# Install git hooks for vscode-extension-mono. Idempotent.
#
#   pre-commit  → tools/pre-commit.sh    (manifest/permissions/etc gates)
#   commit-msg  → npx commitlint         (conventional commits, gates against commitlint.config.js)
#
# Run once after cloning. Re-run safely to update.

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
# Validates the commit message against commitlint.config.js at the repo root.
# $1 is the file containing the message (`.git/COMMIT_EDITMSG` during normal commits).
exec npx --no-install commitlint --edit "$1"
HOOK
chmod +x "$HOOKS/commit-msg"
echo "✓ commit-msg hook 설치: $HOOKS/commit-msg"
