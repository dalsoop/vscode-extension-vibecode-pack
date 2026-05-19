#!/usr/bin/env bash
set -euo pipefail

ok() { printf '  \033[32m✓\033[0m %s\n' "$1"; }
ng() { printf '  \033[31m✗\033[0m %s\n' "$1"; }

if [[ -n "${GIT_INDEX_FILE:-}" ]] || git rev-parse --verify HEAD >/dev/null 2>&1; then
    files_cmd=(git diff --cached --name-only --diff-filter=ACM)
else
    files_cmd=(git ls-files)
fi

FAIL=0
while IFS= read -r file; do
    [[ -f "$file" ]] || continue
    case "$file" in
        */node_modules/*|*/vendor/*|*/dist/*|*/build/*|*/.next/*|*/target/*|*/__pycache__/*) continue ;;
        *.example|*.example.*|*.template|*.template.*|*.sample|*.sample.*) continue ;;
        *.lock|*-lock.json|*-lock.yaml|go.sum) continue ;;
    esac

    if head -2 "$file" 2>/dev/null | grep -q '^\$ANSIBLE_VAULT;'; then
        continue
    fi

    HITS=$(FILE="$file" python3 - <<'PY'
import os, re, sys
path = os.environ["FILE"]

PATTERNS = [
    ("GitLab PAT",            re.compile(r'glpat-[A-Za-z0-9_-]{20,}')),
    ("GitLab Deploy Token",   re.compile(r'gldt-[A-Za-z0-9_-]{20,}')),
    ("GitHub classic PAT",    re.compile(r'ghp_[A-Za-z0-9]{36}')),
    ("GitHub fine-grained",   re.compile(r'github_pat_[A-Za-z0-9_]{82}')),
    ("Anthropic API key",     re.compile(r'sk-ant-[A-Za-z0-9_-]{20,}')),
    ("OpenAI/Anthropic-style sk-", re.compile(r'(?<![A-Za-z0-9_-])sk-(?:proj-|live-|test-)?[A-Za-z0-9_-]{32,}')),
    ("AWS access key",        re.compile(r'(?<![A-Z0-9])AKIA[0-9A-Z]{16}(?![A-Z0-9])')),
    ("PEM private key",       re.compile(r'-----BEGIN (?:RSA |EC |DSA |OPENSSH |)PRIVATE KEY-----')),
    ("Slack token",           re.compile(r'xox[baprs]-[A-Za-z0-9-]{10,}')),
]

PLACEHOLDER_RE = re.compile(r'(X{3,}|x{3,}|<[^>]+>|\.\.\.|REDACTED|EXAMPLE|FAKE|PLACEHOLDER|Y{4,}|0{8,}|1234567|deadbeef)', re.IGNORECASE)  # allow:todo-marker

try:
    with open(path, encoding="utf-8", errors="replace") as f:
        for n, line in enumerate(f, 1):
            if "allow:secret-pattern" in line or "allow:secret" in line:
                continue
            for label, pat in PATTERNS:
                m = pat.search(line)
                if not m:
                    continue
                tok = m.group(0)
                if PLACEHOLDER_RE.search(tok):
                    continue
                masked = tok[:8] + "…" + tok[-4:] if len(tok) > 16 else tok[:6] + "…"
                print(f"{path}:{n}: [{label}] {masked}")
                break
except Exception as e:
    print(f"{path}: read error: {e}", file=sys.stderr)
PY
)
    if [[ -n "$HITS" ]]; then
        ng "시크릿 의심 패턴: $file"
        echo "$HITS" | head -5 | sed 's/^/    /'
        FAIL=1
    fi
done < <("${files_cmd[@]}" 2>/dev/null || true)

if [[ "$FAIL" != "0" ]]; then
    echo ""
    echo "치명: 시크릿이 평문으로 들어갔습니다." >&2
    echo "  1) 즉시 회전 (revoke + 재발급)" >&2
    echo "  2) 파일에서 제거 후 vault 또는 CI/CD variables 로 이전" >&2
    echo "  3) 이미 푸시된 경우 git history rewrite 별 트랙 진행" >&2
    echo "  - placeholder/fixture 라면 'XXXX' 같은 명시 마스크 사용 또는 같은 줄에 'allow:secret-pattern' 마커" >&2
    echo "  - .example/.template/.sample 확장자는 자동 skip" >&2
    exit 1
fi
ok "시크릿 패턴 없음"
