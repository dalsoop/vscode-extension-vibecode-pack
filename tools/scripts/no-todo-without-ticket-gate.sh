#!/usr/bin/env bash
set -euo pipefail

ok() { printf '  \033[32m✓\033[0m %s\n' "$1"; }
ng() { printf '  \033[31m✗\033[0m %s\n' "$1"; }

if [[ -n "${GIT_INDEX_FILE:-}" ]] || git rev-parse --verify HEAD >/dev/null 2>&1; then
    files_cmd=(git diff --cached --name-only --diff-filter=ACM)
else
    files_cmd=(git ls-files)
fi

EXTS_RE='\.(blade\.php|php|js|ts|vue|jsx|tsx|mts|cts|mjs|cjs|py|rs|sh|bash|go|rb|java|kt|swift|toml|yml|yaml|md|tf|hcl)$'

FAIL=0
while IFS= read -r file; do
    [[ -f "$file" ]] || continue
    [[ "$file" =~ $EXTS_RE ]] || continue
    case "$file" in
        */node_modules/*|*/vendor/*|*/dist/*|*/build/*|*/.next/*|*/target/*) continue ;;
        */no-todo-without-ticket-gate.sh) continue ;;
    esac

    HITS=$(FILE="$file" python3 - <<'PY'
import os, re, sys
path = os.environ["FILE"]
TODO_RE = re.compile(r'\b(TODO|FIXME|XXX|HACK)\b')
TICKET_RE = re.compile(r'(\[#\d+\]|\(#\d+\)|#\d{2,}|issues/\d+|gitlab\.internal\.kr/.*?/-/issues/\d+)')
ALLOW_RE = re.compile(r'allow:todo-marker')
try:
    with open(path, encoding="utf-8", errors="replace") as f:
        lines = f.readlines()
except Exception as e:
    print(f"{path}: read error: {e}", file=sys.stderr)
    sys.exit(0)

for i, line in enumerate(lines):
    if not TODO_RE.search(line):
        continue
    if ALLOW_RE.search(line):
        continue
    lo, hi = max(0, i - 5), min(len(lines), i + 6)
    window = "".join(lines[lo:hi])
    if TICKET_RE.search(window):
        continue
    if ALLOW_RE.search(window):
        continue
    print(f"{path}:{i+1}: {line.rstrip()[:140]}")
PY
)
    if [[ -n "$HITS" ]]; then
        ng "ticket ref 없는 TODO/FIXME 발견: $file"
        echo "$HITS" | head -5 | sed 's/^/    /'
        FAIL=1
    fi
done < <("${files_cmd[@]}" 2>/dev/null || true)

if [[ "$FAIL" != "0" ]]; then
    echo ""
    echo "권장: TODO/FIXME/XXX/HACK 는 ticket ref 동반 — 예: TODO(#1234) ... 또는 https://gitlab.internal.kr/.../issues/123" >&2
    exit 1
fi
ok "ticket-less TODO/FIXME 없음"
