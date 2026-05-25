# vibecode-browser-preview-pro v0.4 — Design

날짜: 2026-05-25
대상 확장: `vibecode-browser-preview-pro` (현재 v0.3.0)
관련 문서:

- 이전 spec: `2026-05-25-vibecode-browser-preview-pro-v0.3-design.md`
- 이전 plan: `docs/superpowers/plans/2026-05-25-vibecode-browser-preview-pro-v0.3.md`

## Goal

v0.3 까지 인스펙터/스냅샷/Notes/▲N 배지/ZIP 동봉이 정착됨. v0.4 는 퍼블리셔가 실제 디자인 검수 흐름에서 가장 자주 부딪히는 3 가지 한계를 해소한다:

1. 데스크탑 폭만 보고 작업하던 것을 **디바이스 프리셋** 으로 한 번에 전환
2. 핀 카드를 하나씩 펴봐야 알 수 있던 변경사항을 **Changes 탭**으로 한눈에 비교
3. 라벨만 있던 force state 를 **실제 :hover/:focus/:active 시뮬레이션**으로 승격

각 기능은 독립적으로 동작하지만 v0.4 한 릴리스로 묶어 배포한다 (세션 변경사항 = 1 MR 원칙).

## Non-Goals

- 디바이스 프리셋의 회전/orientation, 5 개 이상 프리셋, 커스텀 width 입력 (YAGNI — 추후 v0.5+)
- 라이브 diff 의 두 스냅샷 비교 (현재 vs 저장본). v0.4 는 "원본 vs 현재 override" 만.
- Cross-origin stylesheet 의 :hover 룰 강제 적용 (CORS 한계). 스캔 결과로 경고만 표시.
- Element-level 스크린샷 (v0.4 후보였지만 webview 제약으로 제외).
- 핀/override 의 영속화 (페이지 리로드 시 초기화 동작은 그대로).

## Architecture

### 파일 구조

```
src/
  inspector/
    inspector-script.ts        (기존 ~395줄, 변경 최소)
    force-state-script.ts      (신규 ~150줄)
  webview/
    client-script.ts           (기존 372 → ~480줄, device + tab 라우팅 추가)
    sections/
      diff-tab.ts              (신규 ~120줄)
    html.ts                    (panel 안 tabs + toolbar device select 추가)
    styles.ts                  (tabs / device wrapper 셀렉터 추가)
```

`force-state-script.ts` 는 `inspector-script.ts` 와 동일 패턴(IIFE 문자열). `editor-provider.ts` 에서 inspector 스크립트 응답 시 force-state 본문을 끝에 concat 해 한 번의 GET 으로 서빙한다 — 별도 라우트를 만들지 않는다.

`webview/sections/diff-tab.ts` 는 vibecode-webview-architecture 패턴을 따라 IIFE 로 노출되는 namespace; `client-script.ts` 가 메인 IIFE 안에서 호출만 한다.

### 데이터 모델 변경

`client-script.ts` 의 `pins: Map<pickId, PinEntry>` 에 필드 추가:

```ts
PinEntry {
  card: HTMLElement
  data: PickPayload
  overrideState: { classes: string[]; inline: string; notes: string }
  badgeEl: HTMLElement
  // 신규 (webview 메모리; JSON 직렬화 시 Array 로 변환)
  forceStates: Set<'hover' | 'focus' | 'focus-visible' | 'active'>
}
```

`changes.json` / `picks.json` 직렬화 시 `Array.from(forceStates)` 로 배열화.

`overrideCount` 계산 함수는 기존 (classes + inline + notes) 에 `forceStates.size` 를 더한다.

### iframe 통신 추가 메시지

기존 `bp:` prefix postMessage 에 신규 메시지 1 개:

- `bp:force-state` (parent → iframe): `{ pickId, state, on }` — 핀 element 에 class 토글 요청

iframe 의 force-state-script 는 이 메시지를 받아 해당 element 에 `vibecode-force-{state}` class 를 add/remove 한다. (iframe 가 element 식별을 위해 `data-bp-pick="<id>"` attribute 를 click 시점에 박는 방식; inspector-script.ts 의 클릭 핸들러에서 이미 ID 발행 중이므로 함께 attribute 추가)

## Feature A — 디바이스 프리셋

### UI

툴바 우측, URL 라벨 **왼쪽** 에 select 추가 (URL 라벨이 자동 우측 정렬 유지):

```
↻ Reload  📝 Edit  ↗ Open  🎯 Inspector  💾 Save   [Device: Auto ▾]   http://127.0.0.1:xxxx/...
```

옵션 4 개:

- `Auto` (default) — width: 100% (현재 동작)
- `Desktop 1280`
- `Tablet 768`
- `Mobile 375`

### 동작

기존 `<div class="frame-wrap">` 의 직계 자식 `<iframe>` 를 한 단계 더 감싼다:

```html
<div class="frame-wrap">
  <div class="device-frame" data-mode="auto">
    <iframe id="preview-frame" ...></iframe>
  </div>
  <div class="overlay">...</div>
  <div class="toast">...</div>
</div>
```

`overlay` / `toast` 는 frame-wrap 의 absolute 자식으로 그대로 둔다 (현재 동작 유지).

CSS:

- `.frame-wrap`: 기존 그대로
- `.device-frame[data-mode="auto"]`: `width:100%; height:100%`
- `.device-frame[data-mode!="auto"]`: `display:flex; align-items:stretch; justify-content:center; background:var(--vscode-editorWidget-background, #2a2a2a); height:100%`
- iframe: device-mode 별로 `width: 1280px | 768px | 375px`, `height:100%`, 좌우 자동 마진은 flex center 가 처리

상태는 webview 메모리에만 (변수 1 개). 영구 저장 X. Reload Window 시 Auto 로 복귀.

## Feature B — Changes 탭

### Panel 구조 변경

기존:

```
<aside class="panel">
  <section> <h3>Pins</h3>  <pins-list/> </section>
  <section> <h3>Assets</h3> <assets-list/> </section>
  <section> <p>snapshotsHint</p> </section>
</aside>
```

신규:

```
<aside class="panel">
  <div class="tabs">
    <button class="tab active" data-tab="pins">Pins (3)</button>
    <button class="tab" data-tab="changes">Changes ▲5</button>
  </div>
  <div class="tab-panel" data-tab="pins"> <pins-list/> </div>
  <div class="tab-panel" data-tab="changes" hidden> <changes-list/> </div>
  <section> <h3>Assets</h3> <assets-list/> </section>
  <section> <p>snapshotsHint</p> </section>
</aside>
```

탭 헤더의 카운트 라벨은 핀 추가/제거 + override 변경시 자동 갱신.

### Changes 컨텐츠

`diff-tab.ts` 의 `renderChanges(pins)`:

- override 가 있는 핀만 (`overrideCount > 0`)
- 각 핀 1 블록:

  ```
  ┌────────────────────────────────────────┐
  │ #2  .nav-link                           │
  │ ── 추가된 클래스 ──                       │
  │   active, is-current                    │
  │ ── 인라인 스타일 ──                       │
  │   color: #fff; padding-top: 12px;       │
  │ ── Force state ──                       │
  │   hover, focus-visible                  │
  │ ── Notes ──                             │
  │   "퍼블리셔에게: hover 일 때만 적용"        │
  └────────────────────────────────────────┘
  ```

- 빈 상태: "변경사항 없음 — 핀에서 클래스/스타일/노트/state 를 수정하세요"
- 핀 selector 클릭 시 Pins 탭으로 전환하고 해당 카드 스크롤

### 갱신 트리거

`refreshOverride(pickId)` 헬퍼가 호출될 때마다:

1. 핀 카드 ▲N 배지 갱신 (기존)
2. 탭 헤더 카운트 (`Pins (N)` / `Changes ▲M`) 갱신
3. Changes 탭이 활성 상태면 `renderChanges` 재호출

## Feature C — Force state 시뮬레이션

### 핵심 아이디어

브라우저는 `:hover` 같은 user-action pseudo-class 를 JS 로 강제할 방법이 표준에 없다. 대신 **stylesheet 의 :hover 룰을 동일한 .vibecode-force-hover class 룰로 복제** 하면, class 를 element 에 add 하는 것으로 같은 스타일이 적용된다.

### 스캔 단계 (inspector 시작 시 1회)

force-state-script.ts:

```ts
const STATES = ['hover', 'focus', 'focus-visible', 'active'];
const SCAN_RESULT = { duplicated: 0, skippedSheets: 0 };

for (const sheet of document.styleSheets) {
  let rules;
  try { rules = sheet.cssRules; }
  catch (e) { SCAN_RESULT.skippedSheets++; continue; }  // cross-origin

  for (const rule of rules) {
    if (rule instanceof CSSStyleRule === false) continue;
    let selector = rule.selectorText;
    let modified = false;
    for (const state of STATES) {
      const pseudo = ':' + state;
      if (selector.includes(pseudo)) {
        selector = selector.split(',').map(s => {
          if (!s.includes(pseudo)) return null;
          return s.replaceAll(pseudo, '.vibecode-force-' + state);
        }).filter(Boolean).join(',');
        modified = true;
      }
    }
    if (modified && selector) {
      try {
        sheet.insertRule(selector + '{' + rule.style.cssText + '}', sheet.cssRules.length);
        SCAN_RESULT.duplicated++;
      } catch (_) { /* invalid selector after rewrite — skip */ }
    }
  }
}

window.parent.postMessage({ type: 'bp:force-state-scan', result: SCAN_RESULT }, '*');
```

webview 가 `bp:force-state-scan` 수신하면 `skippedSheets > 0` 일 때 핀 카드에 작은 경고: "(외부 stylesheet 일부 미적용)". 경고는 핀별이 아니라 패널 상단에 한 번만.

### Toggle 단계 (핀 카드 force-state select 변경 시)

기존 v0.3 select (`label-only`) 를 multi-checkbox 로 교체:

```
Force state:  [ ] :hover   [ ] :focus   [ ] :focus-visible   [ ] :active
```

체크 변경 → `vscode.postMessage({ type: 'forceStateChanged', pickId, states })` → editor-provider 가 iframe 으로 `bp:force-state` 전달 → force-state-script 가 element 에 class 토글.

### 한계 / 안전성

- 동적으로 추가되는 stylesheet (런타임 `style.innerHTML = ...`) 는 스캔 범위 밖. 인스펙터를 한 번 끄고 다시 켜면 재스캔.
- cross-origin sheet 의 :hover 룰은 못 만짐. 경고 표시로 사용자에게 알림.
- 스캔/insert 실패는 모두 try/catch 로 감싸 inspector 본체에 영향 없음.
- 스냅샷 저장 흐름:
  1. force-state-script 가 스캔 단계에서 복제한 룰 텍스트를 `_forceRules: string[]` 배열에 보관
  2. 스냅샷 요청이 들어오면 inspector-script 가 force-state-script 에게 룰 목록을 동기적으로 요청 (같은 IIFE 스코프이므로 window 의 약속된 전역 함수 `window.__bpGetForceRules()` 호출)
  3. 핀 element 의 `vibecode-force-{state}` class 는 이미 DOM 에 박혀 있어 outerHTML serialization 만으로 보존됨
  4. inspector-script 는 serialization 결과 HTML 의 `<head>` 끝에 `<style id="vibecode-force-rules">${rules.join('\n')}</style>` 를 삽입 후 webview 로 전송
  → `state.html` 만 단독으로 열어도 force state 결과가 동일하게 렌더됨

### 핀 카드 force-state 변경 → changes.md 반영

`snapshot-writer.ts` 가 핀별 changes 섹션을 만들 때 forceStates 가 있으면 한 줄 추가:

```
### #2  .nav-link
- 추가된 클래스: active
- Force state: hover, focus-visible
- Notes: ...
```

`changes.json` 에도 `forceStates: string[]` 필드 추가.

## Versioning & Docs

- `package.json` `0.3.0` → `0.4.0`
- `README.md`:
  - `## Pro 전용 (v0.3 shipped)` → `## Pro 전용 (v0.4 shipped)`
  - 디바이스 프리셋 / Changes 탭 / Force state 항목 본문에 추가
  - `## 알려진 한계 (v0.3)` → `## 알려진 한계 (v0.4)`, 해소된 항목 (디바이스 / 다이프 / force state) 제거, 새 한계 (cross-origin sheet, element 스크린샷 v0.5+) 추가
- i18n (`i18n/ko.json`, `i18n/en.json`):
  - 신규 키 (`device.auto`, `device.desktop`, `device.tablet`, `device.mobile`, `tabs.pins`, `tabs.changes`, `changes.empty`, `forceState.hover`, `forceState.focus`, `forceState.focusVisible`, `forceState.active`, `forceState.crossOriginWarning`)
  - `sync:check` 통과해야 빌드 성공

## Build & Verify

각 feature 구현 후:

1. `npm run sync && npm run typecheck && npm run lint` — 깨끗
2. (마지막에) `npm run sync:check && npm run package` — 0.4.0.vsix 생성
3. `code --install-extension *.vsix --force`
4. Reload Window → 더블클릭 `.html` → 각 기능 수동 검증:
   - **Device**: select 변경 시 iframe 폭 변화 + 좌우 회색 배경
   - **Tabs**: 핀 추가 → `Pins (1)`, 클래스/스타일/노트 추가 → `Changes ▲N` 증가, Changes 탭 컨텐츠 렌더
   - **Force state**: 체크 → 실제 :hover 스타일 적용 (배경/색 변경 가시), ▲N 카운트 증가
   - **Snapshot**: Save → `state.html` 에 force class 박혀있음 + `changes.md` 에 Force state 라인 + `changes.json` 에 `forceStates` 필드

## Risk & Mitigation

| Risk | Mitigation |
|---|---|
| force-state stylesheet rewrite 가 페이지 자체 :hover 룰을 깨뜨림 | 원본 룰을 **수정하지 않고 복제만** 추가. 실패 시 try/catch |
| cross-origin sheet 가 있어 일부 :hover 가 적용 안됨 | 패널 상단 경고 1 회 |
| inspector-script.ts + force-state-script.ts concat 으로 인한 IIFE 충돌 | 두 IIFE 모두 `(function(){...})()` 독립 스코프, 글로벌 오염 없음 — concat 안전 |
| Changes 탭 빈번한 갱신으로 성능 저하 | `refreshOverride` 가 trigger; 디바운스 불필요 (사용자 입력 빈도 낮음). 실측 후 필요 시만 |
| device-frame wrap 으로 iframe 사이즈 변경 시 reload-watcher 의 cache-bust 와 충돌 | iframe `src` 변경은 reload 가 담당, wrap 의 width 만 변경하므로 무관 |

## Out of scope (v0.5+ 후보)

- 회전 / orientation toggle, 5+ 디바이스 프리셋, custom width
- 핀/override 의 워크스페이스 영속화
- 두 스냅샷 비교 (snapshot A vs snapshot B diff)
- 동적으로 추가된 stylesheet 의 force-state 재스캔 자동화
- 요소 영역 스크린샷 (canvas-based, html2canvas 등 외부 라이브러리 필요)
