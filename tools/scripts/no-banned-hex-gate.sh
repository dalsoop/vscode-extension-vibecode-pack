#!/usr/bin/env bash
set -euo pipefail

ok() { printf '  \033[32m✓\033[0m %s\n' "$1"; }
ng() { printf '  \033[31m✗\033[0m %s\n' "$1"; }

if [[ -n "${GIT_INDEX_FILE:-}" ]] || git rev-parse --verify HEAD >/dev/null 2>&1; then
    files_cmd=(git diff --cached --name-only --diff-filter=ACM)
else
    files_cmd=(git ls-files)
fi

EXTS_RE='\.(blade\.php|css|scss|html|vue)$'
BANNED='#FAFAF9|#F7F7F9|#F7F5F0|#F4F4F0|#F0F0F3|#FAF9F6|#FFF8E7|#FDF6E3|#F5EFE0|#F5F5DC|#FFFAF0|#E8E4D8|#D7CFC0'

FAIL=0
while IFS= read -r file; do
    [[ -f "$file" ]] || continue
    [[ "$file" =~ $EXTS_RE ]] || continue
    case "$file" in
        */node_modules/*|*/vendor/*|*/dist/*|*/build/*) continue ;;
    esac

    HITS=$(grep -niE "$BANNED" "$file" || true)
    if [[ -n "$HITS" ]]; then
        ng "design.md 위반 hex 발견: $file"
        echo "$HITS" | head -5 | sed 's/^/    /'
        FAIL=1
    fi
done < <("${files_cmd[@]}" 2>/dev/null || true)

if [[ "$FAIL" != "0" ]]; then
    echo ""
    echo "권장: design.md 의 토큰화된 색상 변수 사용 (--bg-*, --surface-*)" >&2
    exit 1
fi
ok "금지 hex 없음"
