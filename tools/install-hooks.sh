#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOOK="$ROOT/.git/hooks/pre-commit"

cat > "$HOOK" << 'HOOK'
#!/usr/bin/env bash
exec "$(git rev-parse --show-toplevel)/tools/pre-commit.sh"
HOOK

chmod +x "$HOOK"
echo "✓ pre-commit hook 설치 완료: $HOOK"
