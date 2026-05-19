#!/usr/bin/env bash
set -euo pipefail

FAIL=0
ok() { printf '  \033[32m✓\033[0m %s\n' "$1"; }
ng() { printf '  \033[31m✗\033[0m %s\n' "$1"; FAIL=1; }

STAGED=$(git diff --cached --name-only --diff-filter=ACM 2>/dev/null | grep -E '\.(ts|tsx|js|jsx|mts|cts)$' || true)

echo "=== manifest.json 검증 ==="
if [[ -f manifest.json ]]; then
    MISSING=$(python3 - <<'PY'
import json, sys
d = json.load(open("manifest.json"))
required = ["name", "version", "manifest_version"]
missing = [k for k in required if k not in d]
if missing:
    print(" ".join(missing))
PY
)
    if [[ -n "$MISSING" ]]; then
        ng "manifest.json 필수 필드 없음: $MISSING"
    else
        ok "manifest.json 필드 OK"
    fi
else
    printf '  \033[33m⚠\033[0m manifest.json 없음 — skip\n'
fi

echo ""
echo "=== permissions 감사 ==="
if [[ -f manifest.json ]]; then
    BROAD=$(python3 - <<'PY'
import json
d = json.load(open("manifest.json"))
perms = d.get("permissions", []) + d.get("host_permissions", [])
flagged = [p for p in perms if p in ("<all_urls>", "tabs", "webRequest", "webRequestBlocking", "http://*/*", "https://*/*")]
if flagged:
    print(" ".join(flagged))
PY
)
    if [[ -n "$BROAD" ]]; then
        ng "광범위 권한 사용: $BROAD — 최소 권한 원칙 확인 필요"
    else
        ok "permissions 이상 없음"
    fi
fi

echo ""
echo "=== TypeScript 타입 검사 ==="
if [[ -f tsconfig.json ]]; then
    if npx tsc --noEmit 2>&1; then
        ok "타입 OK"
    else
        ng "타입 오류 발생"
    fi
else
    printf '  \033[33m⚠\033[0m tsconfig.json 없음 — skip\n'
fi

echo ""
echo "=== ESLint (staged) ==="
if [[ -z "$STAGED" ]]; then
    printf '  \033[33m⚠\033[0m staged TS/JS 없음 — skip\n'
elif command -v npx &>/dev/null && npx eslint --version &>/dev/null 2>&1; then
    if echo "$STAGED" | xargs npx eslint --max-warnings=0 2>&1; then
        ok "eslint OK"
    else
        ng "eslint 위반 발생"
    fi
else
    printf '  \033[33m⚠\033[0m eslint 없음 — skip\n'
fi

echo ""
echo "=== jscpd 중복 코드 감지 ==="
if ! command -v npx &>/dev/null; then
    printf '  \033[33m⚠\033[0m npx 없음 — skip\n'
else
    MAX_CLONES=0
    [[ -f .jscpd-max-clones ]] && MAX_CLONES=$(tr -d '[:space:]' < .jscpd-max-clones)
    SCAN_DIR="src"
    [[ ! -d src ]] && SCAN_DIR="."
    JSCPD_OUT=$(npx jscpd "$SCAN_DIR" \
        --min-lines 4 \
        --min-tokens 50 \
        --ignore "node_modules/**,dist/**,build/**" \
        --reporters "console" 2>/dev/null)
    CLONES=$(echo "$JSCPD_OUT" | grep -oE 'Found [0-9]+ clones' | grep -oE '[0-9]+' || echo "0")
    if [[ "${CLONES}" -gt "${MAX_CLONES}" ]]; then
        echo "$JSCPD_OUT" | grep -A2 "Clone found" || true
        ng "jscpd: ${CLONES}개 클론 감지 (허용 최대: ${MAX_CLONES})"
    else
        ok "jscpd: ${CLONES}개 클론 (기준 통과)"
    fi
fi

echo ""
echo "=== 주석 금지 ==="
if [[ -f tools/scripts/no-comments-gate.sh ]]; then
    bash tools/scripts/no-comments-gate.sh || FAIL=1
else
    printf '  \033[33m⚠\033[0m no-comments-gate.sh 없음 — skip\n'
fi

echo ""
echo "=== 시크릿 평문 노출 금지 ==="
if [[ -f tools/scripts/no-secrets-gate.sh ]]; then
    bash tools/scripts/no-secrets-gate.sh || FAIL=1
else
    printf '  \033[33m⚠\033[0m no-secrets-gate.sh 없음 — skip\n'
fi

echo ""
echo "=== 이모지 금지 ==="
if [[ -f tools/scripts/no-emoji-gate.sh ]]; then
    bash tools/scripts/no-emoji-gate.sh || FAIL=1
else
    printf '  \033[33m⚠\033[0m no-emoji-gate.sh 없음 — skip\n'
fi

echo ""
echo "=== 금지 hex 색상 ==="
if [[ -f tools/scripts/no-banned-hex-gate.sh ]]; then
    bash tools/scripts/no-banned-hex-gate.sh || FAIL=1
else
    printf '  \033[33m⚠\033[0m no-banned-hex-gate.sh 없음 — skip\n'
fi

echo ""
echo "=== <div> 클릭 핸들러 금지 ==="
if [[ -f tools/scripts/no-div-clickable-gate.sh ]]; then
    bash tools/scripts/no-div-clickable-gate.sh || FAIL=1
else
    printf '  \033[33m⚠\033[0m no-div-clickable-gate.sh 없음 — skip\n'
fi

echo ""
echo "=== ticket ref 없는 잔여 표식 금지 ==="
if [[ -f tools/scripts/no-todo-without-ticket-gate.sh ]]; then
    bash tools/scripts/no-todo-without-ticket-gate.sh || FAIL=1
else
    printf '  \033[33m⚠\033[0m no-todo-without-ticket-gate.sh 없음 — skip\n'
fi

echo ""
if [[ "$FAIL" != "0" ]]; then
    echo -e "\033[31m=== ✗ pre-commit 실패 ===\033[0m"
    exit 1
fi
echo -e "\033[32m=== ✓ 전체 통과 ===\033[0m"
