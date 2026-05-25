---
name: vibecode-lint-conventions
description: "vibecode-* 모노레포의 ESLint 룰을 단일 마스터에서 13개 익스텐션에 sync 하고, 기존 위반은 ESLint 공식 suppressions 베이스라인으로 동결, 새 위반만 실패시키는 시스템. Use when: 새 lint 룰 추가, 룰 위반 빚이 어디에 얼마나 있는지 확인, 새 ext 추가 시 룰 전파, 'lint 가 안 잡힌다' 진단 (e.g., 'lint 룰 바꾸자', 'lint 빚 얼마나 있어', '룰 일관성 깨졌다')."
---

# Vibecode Lint Conventions

vscode-extension-mono 의 lint 룰 single-source-of-truth 시스템.

## 왜 필요한가

각 vibecode-* 익스텐션이 자기 `eslint.config.mjs` 를 들고 있어서:
- 룰이 시간 따라 갈라짐 (skills-viewer 만 풀룰, 나머지는 reduced)
- 새 룰 추가 시 13개 파일 수동 업데이트
- 기존 코드 위반이 어디에 얼마 있는지 추적 안 됨
- CI 게이트 없음 → 위반이 조용히 늘어남

## 시스템 개요

```
tools/eslint-config-master.mjs       ← 마스터 (단일 source of truth)
        │
        │  node tools/sync-eslint.mjs
        ▼
vibecode-X/eslint.config.mjs         ← 13개 ext 에 동일하게 복사됨
vibecode-X/eslint-suppressions.json  ← 현재 위반 동결 (커밋됨)
```

- **마스터** 만 사람이 편집. 각 ext 의 `eslint.config.mjs` 는 `AUTO-GENERATED` 헤더 + 마스터 내용. 직접 편집 금지.
- 각 ext 의 **`eslint-suppressions.json`** 은 ESLint 9.24+ 공식 베이스라인. `--suppress-all` 로 생성, 위반량을 파일·룰별 카운트로 동결.
- 기존 위반(suppressed)은 통과. 새 위반은 실패.

## 루트 스크립트 (`vscode-extension-mono/package.json`)

| 명령 | 동작 |
|---|---|
| `npm run lint:sync` | 마스터 → 13개 ext 의 `eslint.config.mjs` 덮어쓰기 |
| `npm run lint:sync:check` | 차이 있으면 exit 1 (pre-commit/CI 게이트) |
| `npm run lint:all` | 모든 ext 의 `npm run lint` 순회 실행 |
| `npm run lint:debt` | 빚 요약 테이블 — ext 별 / 룰별 카운트 |

## ext 측 스크립트 (각 `vibecode-X/package.json`)

기본 `lint` 가 `eslint .` 만 부르면 자동으로 `eslint-suppressions.json` 적용됨. 변경 불필요.

```json
{
  "scripts": {
    "lint": "eslint .",
    "lint:fix": "eslint . --fix"
  }
}
```

## How to apply

### 새 룰 추가하기
1. `tools/eslint-config-master.mjs` 편집해서 룰 추가
2. `node tools/sync-eslint.mjs` 로 전파
3. `npm run lint:all` 로 새 위반 확인
4. 만약 새 위반 잡혔다면:
   - 고치거나
   - 해당 ext 에서 `npx eslint . --suppress-all` 로 베이스라인 갱신
5. 모든 변경(마스터 + sync 결과 + suppressions) 한 번에 커밋

### 룰 위반 빚 추적
- `npm run lint:debt` → 어디에 얼마나 빚이 있는지 즉시 확인
- 베이스라인 파일(`eslint-suppressions.json`) 은 git 에 커밋되어 있어 PR diff 에 변화가 노출됨
- 빚 줄이려면: 위반 fix → `npx eslint . --suppress-all --prune-suppressions` 로 베이스라인 가다듬기

### 새 ext 스캐폴드 시
1. `vibecode-extension-scaffolder` 스킬이 빈 `eslint.config.mjs` 를 생성 (또는 미생성)
2. `node tools/sync-eslint.mjs` 호출 → 마스터로 자동 채워짐
3. 새 ext 라 위반 없으면 suppressions 파일도 없음 (clean)

### Webview 패턴 예외
마스터 config 의 webview override 가 `src/views/**/panel.ts`, `src/views/**/client/**/*.ts`, `src/webview/**/*.ts`, `src/preview/client/**/*.ts`, `src/settings/client/**/*.ts` 에서 `triple-slash-reference`, `no-namespace`, `no-unused-vars` 끔. `vibecode-webview-architecture` 컨벤션상 의도된 코드 형태라.

새 webview 경로가 생기면 마스터의 webview `files` 배열에 추가.

## Pitfalls

### A) `--suppress-all` 은 error 만 동결, warning 은 그대로
ESLint 의 베이스라인은 `severity: error` 만 대상. `no-unused-vars` 가 `warn` 으로 설정돼 있으면 베이스라인에 안 들어가고 lint 출력에 계속 표시됨 (하지만 exit 0). 실패시키고 싶으면 룰을 `error` 로 승격하거나 npm script 에 `--max-warnings 0`.

### B) suppressions 파일 = 빚 상태 스냅샷. 절대 손으로 편집 X
변경은 항상 `npx eslint . --suppress-all` (전체 재생성) 또는 `--prune-suppressions` (해소된 것만 제거) 로. 손편집하면 카운트 안 맞아서 ESLint 가 에러 던짐.

### C) `lint:sync:check` 실패 시
누군가 ext 의 `eslint.config.mjs` 를 직접 편집한 경우. 답:
- 변경이 의도였다면 → 마스터에 옮기고 sync 재실행
- 의도 아니었다면 → sync 재실행해서 덮어쓰기

### D) 새 webview 경로 추가
마스터의 webview `files` 배열에 그 경로 추가 → sync. 안 그러면 webview 컨벤션 코드가 lint 위반으로 잡힘.

### E) 한 ext 안에서 임시로 룰 끄고 싶을 때
ext 의 sync 된 파일 옆에 `eslint.config.local.mjs` 를 두고, 거기에 override 작성. **하지만 sync 된 파일 자체는 수정 금지** (sync 스크립트가 import 후크를 자동 적용하도록 향후 확장 가능). 현재 시점에는 단순 베이스라인만 운영, 로컬 override 는 마스터로 통합 권장.

## Reference

- 마스터 config: [tools/eslint-config-master.mjs](../../tools/eslint-config-master.mjs)
- Sync 스크립트: [tools/sync-eslint.mjs](../../tools/sync-eslint.mjs)
- Lint walker / debt summary: [tools/lint-all.mjs](../../tools/lint-all.mjs)
- ESLint 9 suppressions 공식 문서: https://eslint.org/docs/latest/use/suppress-violations

## Example invocation

- "lint 룰에 `no-floating-promises` 추가하자"
- "lint 빚 얼마나 있어?"
- "이 ext 의 webview 경로가 lint 위반으로 잡혀, 마스터에 추가해줘"
