#!/usr/bin/env bash
set -euo pipefail

ok() { printf '  \033[32m✓\033[0m %s\n' "$1"; }
ng() { printf '  \033[31m✗\033[0m %s\n' "$1"; }

if [[ -n "${GIT_INDEX_FILE:-}" ]] || git rev-parse --verify HEAD >/dev/null 2>&1; then
    files_cmd=(git diff --cached --name-only --diff-filter=ACM)
else
    files_cmd=(git ls-files)
fi

EXTS_RE='\.(blade\.php|html|htm|vue|jsx|tsx|js|ts|md)$'

FAIL=0
HITS_BUF=""

while IFS= read -r file; do
    [[ -f "$file" ]] || continue
    [[ "$file" =~ $EXTS_RE ]] || continue
    case "$file" in
        */node_modules/*|*/vendor/*|*/dist/*|*/build/*|*/.next/*) continue ;;
    esac

    HITS=$(FILE="$file" python3 - <<'PY'
import os, re, sys
path = os.environ["FILE"]
WHITELIST = set("★☆✓✗⚡⚠♾→←")
EMOJI = re.compile(
    "["
    "\U0001F300-\U0001FAFF"
    "\U0001F600-\U0001F64F"
    "\U0001F680-\U0001F6FF"
    "\U0001F700-\U0001F77F"
    "\U0001F780-\U0001F7FF"
    "\U0001F800-\U0001F8FF"
    "\U0001F900-\U0001F9FF"
    "\U0001FA00-\U0001FA6F"
    "\U0001FA70-\U0001FAFF"
    "\U00002600-\U000027BF"
    "\U0001F1E6-\U0001F1FF"
    "]"
)
try:
    with open(path, encoding="utf-8", errors="replace") as f:
        for n, line in enumerate(f, 1):
            for m in EMOJI.finditer(line):
                ch = m.group(0)
                if ch in WHITELIST:
                    continue
                print(f"{path}:{n}: {ch}  {line.rstrip()[:120]}")
                break
except Exception as e:
    print(f"{path}: read error: {e}", file=sys.stderr)
PY
)
    if [[ -n "$HITS" ]]; then
        ng "이모지 발견: $file"
        echo "$HITS" | head -5 | sed 's/^/    /'
        FAIL=1
    fi
done < <("${files_cmd[@]}" 2>/dev/null || true)

if [[ "$FAIL" != "0" ]]; then
    echo ""
    echo "권장: 텍스트 심볼 사용 (★ ☆ ✓ ✗ ⚡ ⚠ ♾ → ←) 또는 SVG 아이콘" >&2
    exit 1
fi
ok "이모지 없음"
