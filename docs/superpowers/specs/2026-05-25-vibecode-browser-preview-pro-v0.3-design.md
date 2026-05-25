# vibecode-browser-preview-pro v0.3 — Design Spec

**Date:** 2026-05-25
**Status:** Draft → awaiting user review
**Builds on:** v0.2 (already merged, MR #9). v0.3 strengthens the publisher-handoff angle: element notes, baseline-vs-modified diff (both JSON and markdown), and one-file ZIP export.

## 1. Purpose

v0.2 의 인스펙터/스냅샷 위에, 디자이너가 핀별로 자유 메모를 남기고, 변형 내역을 사람이 읽기 쉬운 changelog 로 떨어뜨리고, 폴더 전체를 한 파일 ZIP 으로도 떨어뜨려서 퍼블리셔에게 한 방에 넘길 수 있게 한다.

## 2. Scope

### In scope (v0.3)

- **Element notes** — 핀 카드에 free-text notes textarea, picks.json `overrides.notes` 에 저장
- **Baseline capture** — 핀 생성 시점에 className / inline-style attr / computed whitelist 캡처
- **Diff computation** — Save Snapshot 시 per-pin delta 계산 (class added/removed, inline style before→after, force state before→after, computed property deltas)
- **`changes.json`** — 구조화된 delta 리스트 (스냅샷 폴더에 추가)
- **`changes.md`** — 사람이 읽는 마크다운 changelog (스냅샷 폴더에 추가)
- **ZIP export** — `YYYYMMDDHHMMSS.zip` 파일이 폴더와 같은 위치에 자동 생성 (한 파일로 전달용)
- **Live override badge** — 각 핀 카드 헤더에 `▲N` 표시 (현재 적용된 override 개수)
- 새 i18n 키
- 버전 bump 0.2.0 → 0.3.0
- README 업데이트

### Out of scope (v0.3, 명시적 제외 — v0.4 후보)

- Force state 실제 pseudo-class 시뮬레이션 (label-only 유지)
- 디바이스 프리셋 (mobile/tablet/desktop viewport)
- 리로드 시 핀 자동 복원
- 라이브 diff 뷰 패널 (실시간으로 보이는 deltas 리스트) — v0.3 에선 changes.md 가 그 역할
- DevTools 콘솔 / 네트워크

## 3. Architecture

### 3.1 Notes 흐름

1. Webview 가 핀 카드 렌더할 때 Notes textarea 추가 (인라인 스타일 textarea 바로 아래)
2. 사용자가 입력 → 200ms 디바운스 → `{type:'bp:setNotes', pickId, notes}` 메시지 iframe 으로
3. iframe inspector: `pin.overrides.notes = notes` 만 저장 (DOM 변경 없음)
4. Snapshot 수집 시 `notes` 가 picks.json `overrides.notes` 에 포함

### 3.2 Baseline capture & diff

iframe inspector 변경:

- `pinElement(el)` 에서 baseline 캡처:
  ```js
  pin.baseline = {
    className: el.className.toString(),
    inlineStyle: el.getAttribute('style') || '',
    forceState: null,
    notes: '',
    computed: computedFor(el)  // whitelist 24 props
  };
  ```
- `collectSnapshot()` 호출 시 각 핀에 대해 `computeDelta(pin)` 실행:
  ```js
  {
    classes: { added: [...newClasses not in baseline], removed: [...baselineClasses not in current] },
    inlineStyle: { before: baseline.inlineStyle, after: pin.el.getAttribute('style') || '', changed: bool },
    forceState: { before: null, after: overrides.forceState, changed: bool },
    notes: { before: '', after: overrides.notes, changed: bool },
    computed: { [key]: { before, after }, ... }  // only keys that changed
  }
  ```
- Payload 에 추가: `changes: ChangeData[]`

새 타입 `ChangeData`:
```ts
interface ChangeData {
  pickId: number;
  selector: string;
  delta: Delta;
  hasAnyChange: boolean;
}
interface Delta {
  classes: { added: string[]; removed: string[] };
  inlineStyle: { before: string; after: string; changed: boolean };
  forceState: { before: 'hover'|'focus'|'active'|null; after: 'hover'|'focus'|'active'|null; changed: boolean };
  notes: { before: string; after: string; changed: boolean };
  computed: Record<string, { before: string; after: string }>;
}
```

### 3.3 SnapshotWriter 확장

새 메소드들:
- `writeChangesJson(folder, changes)` — `changes.json` (`{version: 1, changes: ChangeData[]}`)
- `writeChangesMd(folder, changes)` — `changes.md` (인간 친화 마크다운)
- `writeZip(parentDir, folderName, files)` — 폴더 옆에 `folderName.zip` 작성

`changes.md` 포맷:
```markdown
# Browser Preview Snapshot — {timestamp}

Source: `{relative-source-path}`
Viewport: {w}×{h}
Pins: {count} ({pinsWithChanges} with changes)

---

## Pin {id}: `{selector}`

{if any change}
**Changes:**
{if classes.added.length} - Class added: `{added.join(', ')}`{/if}
{if classes.removed.length} - Class removed: `{removed.join(', ')}`{/if}
{if inlineStyle.changed} - Inline style: `{before}` → `{after}`{/if}
{if forceState.changed} - Force state: `{before||'(none)'}` → `{after||'(none)'}`{/if}
{if notes.changed} - **Notes:** {notes.after}{/if}
{for k,v in computed} - `{k}`: `{before}` → `{after}`{/for}
{else}
*No changes — pin recorded as-is.*
{/if}

---
{repeat per pin}

## Assets ({n})

{for each asset}
- `{type}` `{sourcePath || url}`{ if size} ({sizeKB} KB){/if}
{/for}
```

### 3.4 ZIP writer (신규 모듈)

`src/zip-writer.ts` — minimal ZIP encoder, no external deps:

```ts
import { deflateRawSync } from 'zlib';
// CRC32 table — pre-computed at module load
// Build ZIP file structure manually:
//   - Local file headers + DEFLATE-compressed (or STORE for empty) data per file
//   - Central directory
//   - End-of-central-directory record
// Public API:
export function buildZip(files: { name: string; data: Buffer }[]): Buffer;
```

호출처: `SnapshotWriter.writeZip` 가 폴더 내 5개 파일을 모아서 `buildZip` → fs.writeFile.

크기 한계 검증: 단일 ZIP < 4GB (ZIP64 미지원, 한계 명시), 단일 파일 < 4GB. v0.3 에선 단순 ZIP 만 — `.html` 이 50MB 넘으면 그건 inspector 가 처음부터 거부했으므로 안전.

CRC32: 256-entry lookup table 로 직접 계산 (~15 lines).

### 3.5 Live override badge

Webview client-script 변경:
- 핀 카드 헤더에 `<span class="pin-badge">▲0</span>` 추가
- Override 변경 (class toggle / inline style / force state / notes) 마다 카운트 재계산:
  - class toggle: 활성화된 toggle 개수
  - inline style: textarea 가 비어있지 않으면 1
  - force state: select 가 빈값 아니면 1
  - notes: textarea 가 비어있지 않으면 1
- Badge 텍스트: `▲{count}` (0 이면 회색, ≥1 이면 강조 색)
- 단순 카운트만 — 실제 diff 계산은 snapshot 시점에만

### 3.6 Messages (new)

**Webview → Iframe:**
- `{type:'bp:setNotes', pickId, notes}`

**Iframe → Webview (snapshot payload extended):**
- `bp:snapshotData.payload.changes: ChangeData[]`

### 3.7 PickOverrides 변경

```ts
interface PickOverrides {
  classToggles: { name: string; enabled: boolean }[];
  inlineStyle: string;
  forceState: 'hover' | 'focus' | 'active' | null;
  notes: string;  // NEW
}
```

기존 picks.json 컨슈머가 있을 수도 있으니 (외부 도구 등) `notes` 가 누락된 경우 빈 문자열로 취급. 새 파일만 양산되므로 backward-compat 신경 안 써도 됨 — 단지 타입에 추가.

## 4. File changes

```
vibecode-browser-preview-pro/
├── package.json                    # MODIFY: version 0.3.0
├── README.md                       # MODIFY: v0.3 features section
├── i18n/ko.json                    # MODIFY: notes/changes/zip keys
├── src/
│   ├── snapshot-types.ts           # MODIFY: add notes, Delta, ChangeData
│   ├── snapshot-writer.ts          # MODIFY: write changes.json/md + zip
│   ├── zip-writer.ts               # NEW: minimal ZIP encoder
│   ├── l10n-bundle.ts              # MODIFY: notes/changes keys
│   ├── inspector/inspector-script.ts  # MODIFY: baseline capture + diff computation
│   └── webview/
│       ├── html.ts                 # MODIFY: notes textarea slot + badge slot
│       ├── styles.ts               # MODIFY: badge style
│       └── client-script.ts        # MODIFY: notes input + badge update
```

## 5. Security

- ZIP writer 는 deflate + CRC32 만 사용 — 정적 분석에서 위험 요소 없음
- 폴더 내 파일들만 ZIP 으로 들어감 — workspace 다른 파일 절대 노출 안 함
- notes 텍스트는 그대로 저장 (HTML 이스케이프는 changes.md 작성 시에만 적용 — backtick 이 깨지지 않도록 `\` 처리)

## 6. Edge cases

- ZIP 작성 도중 실패 → 폴더 자체는 살아있어야 함. ZIP 실패는 warning 으로 처리, snapshot 자체는 성공으로 표시
- 변화 0개 (그냥 핀만 했고 override 없음) → changes.md 에 "*No changes — pins recorded as-is.*" 명시
- notes 가 멀티라인 — markdown 에 출력 시 한 줄로 압축하지 말고 그대로 (publisher 가 읽기 좋게)
- 같은 초 저장 → 폴더는 `-2` suffix, ZIP 도 `YYYYMMDDHHMMSS-2.zip` 으로
- ZIP 크기 너무 클 때 (>100MB 등): 경고 없이 그냥 작성 — 사용자가 알아서 판단

## 7. Manual verify checklist (post-build)

1. v0.2 기능 모두 그대로 동작 (인스펙터 토글, 핀, 클래스/스타일 컨트롤, 리로드, 에셋 수집)
2. 핀 카드에 Notes textarea 노출
3. Notes 입력 → 잠시 후 (디바운스) 다른 변화 없음 (DOM 안 바뀜)
4. 핀 카드 헤더에 `▲0` 뱃지 노출 (초기)
5. 클래스 토글 추가 → `▲1`, 인라인 스타일 입력 → `▲2`, force state 선택 → `▲3`, notes 입력 → `▲4`
6. 클래스 토글 해제 → 카운트 즉시 감소
7. 💾 Save Snapshot → 폴더에 `changes.json` + `changes.md` 추가 (총 6 파일)
8. 폴더와 같은 부모 디렉토리에 `YYYYMMDDHHMMSS.zip` 생성
9. ZIP 풀어보면 같은 5+1 파일 다 들어있음 (state.html / picks.json / assets.json / changes.json / changes.md / meta.json)
10. `changes.md` 가 마크다운 뷰어에서 깔끔하게 렌더 (각 핀별 변경사항 + Notes)
11. `changes.json` 안에 per-pin Delta 구조 정확 (added/removed classes, inline style before/after, computed delta keys only)
12. 변화 없는 핀이 있으면 `hasAnyChange: false` + changes.md 에 "No changes" 메시지
13. ko 로케일에서 새 키 한국어로 보임 (Notes, Changes 등)
14. `package.json` version 0.3.0 반영
15. 같은 초에 두 번 저장 → 두번째 폴더 `-2`, ZIP 도 `-2.zip`

## 8. Future work (v0.4+)

- Force state 실제 pseudo-class 시뮬레이션 (stylesheet rewriting)
- 디바이스 프리셋 (Desktop / Tablet / Mobile viewport)
- 리로드 시 핀 복원 (selector 재매칭)
- 라이브 diff 패널 (실시간 deltas 시각화)
- 요소 스크린샷 (html2canvas-like) per pin
- DevTools 콘솔 / 네트워크 뷰
