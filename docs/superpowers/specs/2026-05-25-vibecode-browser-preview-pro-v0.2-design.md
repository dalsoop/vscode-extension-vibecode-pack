# vibecode-browser-preview-pro v0.2 — Design Spec

**Date:** 2026-05-25
**Status:** Draft → awaiting user review
**Builds on:** `vibecode-browser-preview` v0.1 (already merged, see 2026-05-25-vibecode-browser-preview-design.md). The Pro fork starts byte-identical to base; v0.2 adds the inspector + state controls + snapshot export on top.

## 1. Purpose

`.html` 라이브 프리뷰 안에서 디자이너/엔지니어가 요소를 짚어보고 (selector + 매칭 CSS), 가볍게 상태를 컨트롤하고 (클래스 토글 / 인라인 스타일 / force state), 시점 스냅샷을 폴더로 저장해서 퍼블리셔에게 바로 넘길 수 있게 한다.

## 2. Scope

### In scope (v0.2)

- Webview 우측 collapsible inspector 패널 (toolbar 의 Inspector toggle 버튼으로 on/off)
- PreviewServer 가 `.html` 응답에 `<script src="/__bp_inspector.js">` 자동 inject (가상 경로, 서버가 자체 인스펙터 스크립트 서빙)
- 인스펙터 활성화 시 iframe 안에서:
  - 호버 → 요소 outline overlay + selector path tooltip
  - 클릭 → 핀 (이벤트 중단 — 페이지 클릭은 가지 않음)
- Inspector 패널:
  - 핀한 요소 카드 리스트 (selector / matchedCSS / computed 핵심 / 변형 컨트롤)
  - 변형 컨트롤: 클래스 토글 체크박스, 인라인 스타일 textarea, force state (`:hover` `:focus` `:active`) 토글
  - 자동 수집되는 에셋 패널 (CSS/JS/이미지/폰트, `PerformanceObserver` + DOM 초기 스캔)
- Save Snapshot 버튼 → 워크스페이스 내 `.vibecode/browser-preview/YYYYMMDDHHMMSS/` 디렉토리에 4파일 저장:
  - `state.html` — 변형 반영된 전체 outerHTML
  - `picks.json` — 핀한 요소들
  - `assets.json` — 수집된 에셋
  - `meta.json` — 메타데이터
- 새 i18n 키 추가 (인스펙터 / 스냅샷 관련)
- viewType 은 base 와 분리 (`vibecodeBrowserPreviewPro.editor`) — 두 확장 공존 가능

### Out of scope (v0.2, 명시적 제외)

- 요소별 노트/주석 (v0.3)
- 디바이스 프리셋 토글 (v0.3)
- 원본 vs 변형 diff 뷰 (v0.3)
- ZIP 에크스포트 (v0.3)
- 리로드 시 인스펙터 핀/변형 복원 (단순화 — 매 리로드마다 리셋)
- DevTools 콘솔 노출
- 외부 fetch / XHR 캡처 (`PerformanceObserver` 가 잡는 것까지만)

## 3. Architecture

### 3.1 Inspector script injection

`PreviewServer` 에 두 가지 변경:

1. **가상 경로 `/__bp_inspector.js`** 핸들러 추가 — 정적 파일 아니라 메모리에서 인스펙터 IIFE 스트링 응답.
2. **`.html` 응답을 스트림이 아닌 버퍼로 읽어서 `</body>` 또는 `</html>` 직전에 `<script src="/__bp_inspector.js"></script>` 1줄 inject.** 파일 크기 제한 두기 (예: 5MB 초과 시 inject 스킵 + 경고).

`/__bp_inspector.js` 는 동일 origin (http://127.0.0.1:PORT) 으로 서빙되므로 iframe 안에서 정상 실행. parent webview 와는 `window.parent.postMessage` 로 통신.

### 3.2 Inspector script (inside iframe)

책임:
- 호버 시 요소 outline 표시 (`<div>` overlay with position:fixed, pointer-events:none, 절대좌표로 따라다님)
- 클릭 시 핀 (이벤트 stopPropagation + preventDefault)
- 핀된 요소 정보 수집: selector path, matched CSS rules (heuristic — 모든 stylesheet 의 `cssRules` 순회해서 `element.matches(rule.selectorText)` true 인 것만), computed style 핵심 속성, bounding box
- 변형 명령 수신 (`{type: 'toggleClass', selector, className}`, `{type: 'setInlineStyle', selector, css}`, `{type: 'forceState', selector, state}`)
- 자산 수집: 초기 DOM 스캔 + `PerformanceObserver({entryTypes: ['resource']})` 로 추가 리퀘스트 감지
- 스냅샷 요청 시 `{outerHTML, picks, assets}` 응답

Force state 구현 — **v0.2 단순화**: 진짜 `:hover` pseudo-class 는 강제 불가하므로, 사용자가 선택한 force state (`hover`/`focus`/`active`/`none`) 를 picks.json `overrides.forceState` 에 기록만 하고, 실제 시각 변화는 사용자가 인라인 스타일로 직접 입력하는 방식. 즉 v0.2 의 force state 셀렉트는 "이 핀 카드가 의도하는 상태가 무엇인지 라벨링" 용도. 정식 pseudo-class 강제 (`__bp_force_hover` 클래스 inject + 호버 셀렉터 rewrite) 는 v0.3.

### 3.3 Webview UI 변경

기존 toolbar 에 버튼 1개 추가: **🎯 Inspector** (toggle).

Inspector ON 시 webview 레이아웃:

```
┌──────────────────────────────────────────────┐
│ Toolbar [↻] [📝] [↗] [🎯 Inspector ON] [💾 Save]
├──────────────────────────────────┬───────────┤
│                                  │ Inspector │
│                                  │ Panel     │
│       iframe (preview)           │ (300px,  │
│                                  │ resizable)│
│                                  │           │
│                                  │           │
└──────────────────────────────────┴───────────┘
```

Inspector OFF 시: 패널 숨김, 기존 v0.1 와 동일한 풀폭 iframe.

Inspector 패널 내용 (스크롤):

- 상단 헤더: "Inspector" + 핀 카운트
- 핀 카드 리스트 (각 카드):
  - selector path (모노스페이스, copy 버튼)
  - matched CSS (간단 표시 — 각 매칭 룰 1줄)
  - computed 핵심 (화이트리스트: `display`, `position`, `top/right/bottom/left`, `width`, `height`, `padding`, `margin`, `border`, `borderRadius`, `color`, `backgroundColor`, `backgroundImage`, `fontFamily`, `fontSize`, `fontWeight`, `lineHeight`, `textAlign`, `opacity`, `transform`, `boxShadow`)
  - 변형 컨트롤 3개: 클래스 토글 / 인라인 스타일 textarea / force state 셀렉트
  - 🗑 unpin
- 하단: 자산 섹션 — 타입별 collapsible 리스트

### 3.4 Save Snapshot 흐름

1. 사용자가 💾 클릭
2. Webview → ext: `{type: 'requestSnapshot'}`
3. Ext → webview → iframe: `{type: 'collectSnapshot'}`
4. Iframe 인스펙터 → webview → ext: `{type: 'snapshotData', outerHTML, picks, assets, viewport}`
5. Ext: 워크스페이스 루트의 `.vibecode/browser-preview/` 안에 `YYYYMMDDHHMMSS/` 디렉토리 생성, 4파일 write
6. Ext → webview: `{type: 'snapshotSaved', path}` → 패널에 toast 표시 + 폴더 열기 버튼

타임스탬프 포맷: `YYYYMMDDHHMMSS` (예: `20260525143012`), 로컬 시간 기준.

### 3.5 Snapshot 파일 스키마

#### `state.html`
순수 HTML — `document.documentElement.outerHTML` 그대로 (변형 반영). 브라우저에서 그대로 열 수 있어야 한다. inspector script (`/__bp_inspector.js`) 참조는 strip (퍼블리셔는 인스펙터 필요 없음).

#### `picks.json`
```json
{
  "version": 1,
  "picks": [
    {
      "id": 1,
      "selector": "main > section.hero > h1.title",
      "boundingBox": { "x": 120, "y": 80, "width": 600, "height": 48 },
      "matchedCSS": [
        { "selector": ".hero h1.title", "source": "/css/main.css:42", "declarations": "font-size: 2rem; color: #222;" }
      ],
      "computed": {
        "display": "block",
        "fontSize": "32px",
        "color": "rgb(34, 34, 34)",
        "marginBlockStart": "16px"
      },
      "overrides": {
        "classToggles": [{ "name": "active", "enabled": true }],
        "inlineStyle": "color: red;",
        "forceState": null
      }
    }
  ]
}
```

#### `assets.json`
```json
{
  "version": 1,
  "assets": [
    { "url": "http://127.0.0.1:PORT/css/main.css", "type": "stylesheet", "sourcePath": "css/main.css", "size": 4821, "mime": "text/css" },
    { "url": "http://127.0.0.1:PORT/js/app.js", "type": "script", "sourcePath": "js/app.js", "size": 12048, "mime": "text/javascript" },
    { "url": "http://127.0.0.1:PORT/img/hero.png", "type": "image", "sourcePath": "img/hero.png", "size": 84200, "mime": "image/png" }
  ]
}
```
`sourcePath` 는 워크스페이스 상대경로. 외부 URL 인 경우 비움. `size` 는 응답 헤더 또는 fs.stat.

#### `meta.json`
```json
{
  "version": 1,
  "savedAt": "2026-05-25T14:30:12+09:00",
  "savedAtLocal": "20260525143012",
  "sourceFile": "src/pages/index.html",
  "workspaceRoot": "/Users/jeonghan/Documents/.../my-project",
  "viewport": { "width": 1280, "height": 800 },
  "userAgent": "...",
  "summary": {
    "picksCount": 3,
    "assetsCount": 12,
    "overridesCount": 2
  }
}
```

### 3.6 Messages

**Webview → Ext (new):**
- `{type: 'toggleInspector', on: boolean}`
- `{type: 'requestSnapshot'}`

**Ext → Webview (new):**
- `{type: 'snapshotSaved', path: string}`
- `{type: 'snapshotError', message: string}`

**Webview → Iframe (via postMessage, new):**
- `{type: 'bp:setInspectorMode', on: boolean}`
- `{type: 'bp:toggleClass', pickId, className, enabled}`
- `{type: 'bp:setInlineStyle', pickId, css}`
- `{type: 'bp:setForceState', pickId, state}`
- `{type: 'bp:unpin', pickId}`
- `{type: 'bp:collectSnapshot'}`

**Iframe → Webview (via postMessage to parent, new):**
- `{type: 'bp:pinned', pick: PickData}`
- `{type: 'bp:assetAdded', asset: AssetData}` (점진적 — 새 리퀘스트 잡을 때마다)
- `{type: 'bp:snapshotData', outerHTML, picks, assets, viewport}`
- `{type: 'bp:ready'}` — 인스펙터 스크립트 로드 완료 시그널

`bp:` prefix 로 base 메시지와 충돌 방지.

## 4. File layout (changes / additions on top of v0.1)

```
vibecode-browser-preview-pro/
├── src/
│   ├── preview-server.ts          # MODIFY: add /__bp_inspector.js handler + .html injection
│   ├── editor-provider.ts          # MODIFY: handle new messages, write snapshot
│   ├── snapshot-writer.ts          # NEW: serializes snapshot data to disk
│   ├── inspector/
│   │   └── inspector-script.ts     # NEW: exports INSPECTOR_SCRIPT (IIFE string, served to iframe)
│   └── webview/
│       ├── html.ts                 # MODIFY: add Inspector toggle + Save buttons + side panel skeleton
│       ├── styles.ts               # MODIFY: side panel layout
│       └── client-script.ts        # MODIFY: inspector panel logic + message bridge iframe↔ext
├── i18n/ko.json                    # MODIFY: add inspector/snapshot keys
└── scripts/nls-defaults.json       # MODIFY: (none — runtime keys live in i18n/ko runtime block; EN is just key name)
```

## 5. Security

- inspector-script 은 동일 origin (preview-server) 에서 서빙 — 추가 CSP 변경 없음
- webview CSP 의 `frame-src http://127.0.0.1:* http://localhost:*` 는 그대로
- snapshot 저장 시 `.vibecode/browser-preview/` 디렉토리는 워크스페이스 안에만 — 워크스페이스 루트 escape 방지 (timestamp 디렉토리명만 안전하게 생성)
- `state.html` 에 inspector script 참조 strip 시 정규식 단순치환 (`<script src="/__bp_inspector.js"></script>` 한 줄 삭제) — 사용자 코드의 정상 script 는 그대로 보존
- iframe → parent postMessage 시 origin 검증: parent 는 받을 때 `event.origin === inspectorOrigin` 만 수용

## 6. Edge cases

- 사용자가 .gitignore 에 `.vibecode/` 가 없으면 snapshot 이 git 에 들어감 — 첫 snapshot 저장 시 `.vibecode/.gitignore` 자동 생성 (`*` 한 줄). 기존 파일 있으면 건드리지 않음.
- 같은 초에 두 번 저장 → 디렉토리 충돌. 이미 존재하면 `-2`, `-3` suffix.
- 워크스페이스 폴더가 없는 ad-hoc 모드에서 Save 클릭 → `.vibecode/` 둘 데가 없음 → 에러 안내.
- HTML 파일이 5MB 초과 → inspector inject 스킵, 패널에 "Inspector unavailable (file too large)" 표시.
- iframe content 가 `<frameset>` 같은 비정상 구조 → outerHTML 그대로 캡처.
- 사용자가 페이지 새로고침 (preview 의 reload 버튼 또는 파일 저장 reload) → 핀 모두 클리어. Inspector toggle 상태는 유지.

## 7. Manual verify checklist (post-build)

1. 워크스페이스 안에 작은 multi-asset .html 페이지 (`<link rel="stylesheet" href="./style.css">`, `<script src="./app.js">`, `<img src="./img/foo.png">`) 더블클릭 → 프리뷰 열림 (vibecode-browser-preview-pro)
2. 페이지 정상 렌더 + asset 다 로드 (base 와 동일)
3. 🎯 Inspector 버튼 클릭 → 우측 패널 등장 + 자동 수집된 asset 목록 표시 (style.css, app.js, img/foo.png 다 보임)
4. iframe 안의 `<h1>` 호버 → outline + selector tooltip
5. `<h1>` 클릭 → 인스펙터 패널에 카드 추가 (selector, matchedCSS, computed)
6. 카드의 클래스 토글 → 즉시 iframe 에 반영
7. 인라인 스타일 textarea 에 `color: red` 입력 → 즉시 적용
8. 💾 Save Snapshot 클릭 → `.vibecode/browser-preview/YYYYMMDDHHMMSS/` 디렉토리 생성, 4파일 존재
9. `state.html` 을 별도 브라우저로 열기 → 변형 반영된 페이지 (단 inspector script 는 빠져있음)
10. `picks.json` 안에 선택했던 selector + overrides 들어있음
11. `assets.json` 에 사용된 에셋 정확히 나열
12. `meta.json` 에 timestamp / 원본 경로 / viewport 정확
13. `.vibecode/.gitignore` 자동 생성 (첫 저장 시)
14. 워크스페이스에서 파일 저장 (CSS 변경 등) → iframe 리로드 + 핀 클리어, Inspector toggle 은 ON 그대로
15. Inspector OFF 토글 → 패널 사라지고 풀폭 iframe
16. 같은 초에 Save 두 번 → 두번째는 `-2` suffix 로 폴더 생성
17. 5MB 초과 .html → "Inspector unavailable" 메시지
18. ko 로케일에서 새 i18n 키 한국어로 보임

## 8. Future work (v0.3+)

- 요소별 메모/주석 (post-it)
- 디바이스 프리셋 (mobile/tablet/desktop) 토글
- 원본 vs 변형 diff 뷰
- ZIP 한방 export
- Force pseudo-class (`:hover` `:focus` `:active`) 정식 시뮬레이션
- 리로드 시 핀 복원 (selector 다시 매칭)
- DevTools 콘솔 / 네트워크 뷰
