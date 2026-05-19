#!/usr/bin/env bash
set -euo pipefail

ok() { printf '  \033[32m✓\033[0m %s\n' "$1"; }
ng() { printf '  \033[31m✗\033[0m %s\n' "$1"; }

if [[ -n "${GIT_INDEX_FILE:-}" ]] || git rev-parse --verify HEAD >/dev/null 2>&1; then
    files_cmd=(git diff --cached --name-only --diff-filter=ACM)
else
    files_cmd=(git ls-files)
fi

EXTS_RE='\.(blade\.php|vue|jsx|tsx|html)$'

FAIL=0
while IFS= read -r file; do
    [[ -f "$file" ]] || continue
    [[ "$file" =~ $EXTS_RE ]] || continue
    case "$file" in
        */node_modules/*|*/vendor/*|*/dist/*|*/build/*|*/.next/*) continue ;;
    esac

    HITS=$(FILE="$file" python3 - <<'PY'
import os, re, sys
path = os.environ["FILE"]
try:
    with open(path, encoding="utf-8", errors="replace") as f:
        src = f.read()
except Exception as e:
    print(f"{path}: read error: {e}", file=sys.stderr)
    sys.exit(0)

DIV_TAG = re.compile(r"<div\b[^>]*>", re.IGNORECASE | re.DOTALL)
CHECKS = [
    (re.compile(r"\bwire:click\s*="), "wire:click"),
    (re.compile(r"\bonclick\s*=", re.IGNORECASE), "onclick"),
    (re.compile(r"style\s*=\s*[\"'][^\"']*cursor\s*:\s*pointer", re.IGNORECASE), "style cursor:pointer"),
    (re.compile(r"class\s*=\s*[\"'][^\"']*\bcursor-pointer\b", re.IGNORECASE), "class cursor-pointer"),
]

line_starts = [0]
for i, c in enumerate(src):
    if c == "\n":
        line_starts.append(i + 1)

def lineno(off):
    import bisect
    return bisect.bisect_right(line_starts, off)

for m in DIV_TAG.finditer(src):
    tag = m.group(0)
    for rx, label in CHECKS:
        if rx.search(tag):
            ln = lineno(m.start())
            print(f"{path}:{ln}: <div {label}>  {tag[:120]}")
            break
PY
)
    if [[ -n "$HITS" ]]; then
        ng "<div> 클릭 핸들러 발견: $file"
        echo "$HITS" | head -5 | sed 's/^/    /'
        FAIL=1
    fi
done < <("${files_cmd[@]}" 2>/dev/null || true)

if [[ "$FAIL" != "0" ]]; then
    echo ""
    echo "권장: 클릭 가능한 요소는 <a> 또는 <button> — 접근성/키보드 네비게이션 보장" >&2
    exit 1
fi
ok "<div> 클릭 핸들러 없음"
