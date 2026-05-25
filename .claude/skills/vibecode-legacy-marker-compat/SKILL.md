---
name: vibecode-legacy-marker-compat
description: "확장이 사용자 파일에 임베드하는 블록(예- CLAUDE.md, README.md, .cursorrules 내 \"<!-- foo-START -->...<!-- foo-END -->\" 블록) 의 마커 이름을 변경(리브랜드)할 때, 이미 배포된 옛 마커를 깨지 않고 흡수하는 패턴. Use when: 패키지/명령어 리브랜드로 마커 prefix 가 바뀌었거나, 사용자 파일에 박혀있는 블록 식별자를 옮겨야 할 때 (e.g., \"ccskills→vibeskills 마커 호환\", \"기존 사용자 블록 안 깨지게 prefix 바꾸기\")."
---

# Legacy Marker Backward-Compat

확장이 사용자의 markdown/config 파일에 자동 삽입하는 **블록 마커**(`<!-- name-START -->...<!-- name-END -->`) 의 이름을 바꿔야 할 때 쓰는 패턴.

## 문제

리브랜드(예: `ccskills` → `vibeskills`)로 마커 prefix 가 바뀌면:
- 이미 사용자 CLAUDE.md/README/.cursorrules 에 박혀있는 옛 블록은 새 코드로 못 찾음
- "block exists?" 검사가 false 가 되어 새 블록을 *추가로* 또 삽입 → 중복
- 옛 블록은 더 이상 자동 갱신되지 않아 stale

## 해결 패턴 — read both, write new

핵심 원칙:
- **읽기/검출** 시: 옛 + 새 마커 *둘 다* 인식 (regex alternation)
- **쓰기/갱신** 시: 항상 새 마커로 교체

### 코드

`vibecode-skills-viewer/src/instructions.ts` 의 실제 구현:

```ts
const START = '<!-- vibeskills-START -->';
const END = '<!-- vibeskills-END -->';

// Legacy markers from the old "ccskills" brand. Detected so existing user
// blocks aren't duplicated or orphaned after the rename.
const LEGACY_START = '<!-- ccskills-START -->';
const LEGACY_END = '<!-- ccskills-END -->';

// Matches a block with either marker pair (mix-and-match too, in case a
// previous write was interrupted mid-rename).
const ANY_BLOCK_RE = new RegExp(
  `(?:${START}|${LEGACY_START})[\\s\\S]*?(?:${END}|${LEGACY_END})`
);
// Same but consumes surrounding newlines — used when DELETING the block
// to avoid orphan blank lines.
const ANY_BLOCK_WITH_NL_RE = new RegExp(
  `\\n?(?:${START}|${LEGACY_START})[\\s\\S]*?(?:${END}|${LEGACY_END})\\n?`
);

function buildBlock(body: string): string {
  return `${START}\n${body}\n${END}`;  // write 는 항상 신규 마커
}

export function upsertBlock(filePath: string, body: string): void {
  const cur = fs.readFileSync(filePath, 'utf8');
  const block = buildBlock(body);
  if (ANY_BLOCK_RE.test(cur)) {
    // 옛/새 마커 어느 쪽이든 매칭 — 신규 마커 블록으로 교체
    fs.writeFileSync(filePath, cur.replace(ANY_BLOCK_RE, block));
    return;
  }
  // 블록 없으면 파일 끝에 추가
  fs.writeFileSync(filePath, cur.replace(/\n*$/, '') + '\n\n' + block + '\n');
}

export function removeBlock(filePath: string): void {
  const cur = fs.readFileSync(filePath, 'utf8');
  if (!ANY_BLOCK_RE.test(cur)) return;
  fs.writeFileSync(filePath, cur.replace(ANY_BLOCK_WITH_NL_RE, ''));
}
```

### 검출 전용 모듈도 함께

`instructionsDetector.ts` (트리뷰/상태바가 "이 파일 블록 있나?" 묻는 경로) 도 동일하게 `[START, LEGACY_START]` 배열로 검사:

```ts
export const START = '<!-- vibeskills-START -->';
export const END = '<!-- vibeskills-END -->';
export const LEGACY_START = '<!-- ccskills-START -->';
export const LEGACY_END = '<!-- ccskills-END -->';

function firstIndex(raw: string, candidates: string[]): number {
  let min = -1;
  for (const c of candidates) {
    const idx = raw.indexOf(c);
    if (idx >= 0 && (min < 0 || idx < min)) min = idx;
  }
  return min;
}

const startIdx = firstIndex(raw, [START, LEGACY_START]);
const endMatch = firstEndAfter(raw, [END, LEGACY_END], startIdx);
```

## 체크리스트

리브랜드 PR 에서 마커 변경을 안전하게 하려면:

1. [ ] 새 마커 상수 (`START`, `END`) 추가
2. [ ] 옛 마커 상수 (`LEGACY_START`, `LEGACY_END`) *유지* — 삭제 금지
3. [ ] read/detect 경로의 모든 regex/indexOf 가 `[START, LEGACY_START]` 둘 다 검사
4. [ ] write 경로는 새 마커만 사용
5. [ ] 테스트: 옛 마커가 박힌 파일을 upsert → 새 마커로 정확히 교체되고 중복 없음
6. [ ] 테스트: 옛 마커가 박힌 파일을 remove → 깨끗이 제거
7. [ ] (옵션) 텔레메트리/로그로 legacy 마커 만난 빈도 추적 — 일정 기간 후 LEGACY 제거 시점 판단

## 언제 LEGACY 를 떼어내도 되나

기준 (보수적):
- 새 확장 버전 배포 후 최소 6개월 경과
- 텔레메트리/로그에서 legacy 마커 매칭이 충분히 줄어들었을 때
- 또는 "마이그레이션 끝" 메이저 버전 (예: v3.0) 의 changelog 에 명시

지우면 옛 마커 박힌 사용자 파일은 stale block 으로 남고, 새 코드가 *또* 신규 마커 블록을 추가해서 중복 발생 — 그래서 보수적으로 유지.

## 관련 사례

- `vibecode-skills-viewer/src/instructions.ts` (commit history 의 `ccskills→vibeskills` 리브랜드 PR)
- `vibecode-skills-viewer/src/instructionsDetector.ts` 동일 패턴
- 추후 다른 vibecode-* 확장이 임베드 블록을 도입할 때 동일 구조 권장
