# vibecode-browser-preview — Design Spec (v0.1)

**Date:** 2026-05-25
**Status:** Draft → awaiting user review

## 1. Purpose

워크스페이스의 `.html` 파일을 더블클릭하면 텍스트 편집기 대신 라이브 프리뷰가 열리고, 워크스페이스 내 파일이 저장될 때마다 프리뷰가 자동 리로드되는 VSCode 확장.

기존 vibecode-env-viewer-* 와 동일한 customEditor 패턴을 따른다.

## 2. Scope

### In scope (v0.1)

- `.html` / `.htm` 파일을 customEditor (`priority: default`) 로 등록
- 워크스페이스 루트를 정적 서빙하는 로컬 HTTP 서버 (127.0.0.1, 커널 할당 포트)
- 서버는 첫 프리뷰 열릴 때 lazy start, 마지막 프리뷰 닫히면 close
- Webview 안에 toolbar + iframe 구조, iframe src 는 `http://127.0.0.1:PORT/<workspace-relative-path>`
- 워크스페이스 내 모든 파일 변경/생성/삭제 감시 → 200ms 디바운스 → iframe 강제 리로드
- 노이즈 필터: `node_modules/`, `.git/`, `dist/`, `out/` 경로 변경은 무시
- Toolbar 3버튼: Reload / Edit Source / Open in External Browser
- l10n: `package.nls.{ko,en}.json` + `l10n/bundle.l10n.{ko}.json` + `i18n/ko.json` (3블록 구조)
- `scripts/sync-nls.mjs` 동기화 스크립트

### Out of scope (v0.1, 명시적 제외)

- localhost dev 서버 프록시 (npm run dev, vite, next 등)
- 임의 URL 입력 / 주소창 / 북마크
- 디바이스 에뮬레이션, 반응형 프리뷰
- DevTools, 콘솔 노출
- `.gitignore`-aware 파일 필터링
- 부분 리로드 (HMR-like) — 매번 full reload
- 자동화 테스트

## 3. Architecture

### 3.1 Units

세 개의 독립된 책임 단위로 분리한다.

#### `BrowserPreviewEditorProvider` (`src/editor-provider.ts`)
- `vscode.CustomTextEditorProvider` 구현
- `resolveCustomTextEditor(document, panel, token)` 에서:
  - PreviewServer 가 아직 안 떠 있으면 시작
  - panel.webview.html 에 toolbar + iframe HTML 채움
  - `iframe.src = serverUrl + workspaceRelativePath`
  - 메시지 핸들러 부착 (`editSource`, `openExternal`, `manualReload`)
  - `panel.onDidDispose` 에서 active panel 목록 decrement, 0 되면 PreviewServer.close()
- `retainContextWhenHidden: true` (탭 전환해도 iframe state 유지)

#### `PreviewServer` (`src/preview-server.ts`)
- 싱글톤 클래스 (워크스페이스당 하나)
- `start(rootDir): Promise<URL>` — `http.createServer().listen(0, '127.0.0.1')` 로 빈 포트 받음
- 정적 파일 서빙: 요청 경로 → `path.join(rootDir, requestPath)` 매핑
  - `path.normalize` 후 root 밖으로 escape 못하게 검증 (path traversal 방어)
  - mime: `.html` → `text/html`, `.js` → `text/javascript`, `.css` → `text/css`, `.json` → `application/json`, 이미지/폰트 기본 매핑, 나머지 `application/octet-stream`
  - 디렉토리 요청 시 `index.html` 폴백
- `close(): Promise<void>` — 진행중 connection 다 닫고 server.close()

#### `ReloadWatcher` (`src/reload-watcher.ts`)
- `vscode.workspace.createFileSystemWatcher('**/*')` 구독
- onDidChange / onDidCreate / onDidDelete 통합 → 200ms debounce
- 무시 패턴 매칭: `/node_modules/`, `/.git/`, `/dist/`, `/out/` 포함된 경로 스킵
- 통과한 이벤트 → 등록된 콜백 호출 (EditorProvider 가 등록해서 모든 active panel 에 reload 메시지 broadcast)

### 3.2 Root selection 규칙

PreviewServer 는 `rootDir` 별로 인스턴스 하나를 캐싱한다 (같은 root 는 공유).

열리는 `.html` 파일에 대해 root 를 다음 우선순위로 선택한다:

1. `vscode.workspace.getWorkspaceFolder(doc.uri)` 가 폴더를 돌려주면 → 그 폴더가 root
2. 어떤 workspace folder 에도 속하지 않으면 → 그 파일이 위치한 디렉토리가 root (ad-hoc 모드)
3. 파일이 unsaved (untitled) 이고 workspace folder 도 0개면 → "Open a folder first" placeholder UI

각 root 별 PreviewServer 는 마지막 panel 닫히면 close. 여러 root 가 동시에 활성이면 서로 다른 포트로 동시 listen.

### 3.3 Webview ↔ Extension messages

**Extension → Webview:**
```
{ type: 'serverReady', url: string, relativePath: string }
{ type: 'reload' }
{ type: 'serverError', message: string }
```

**Webview → Extension:**
```
{ type: 'editSource' }
{ type: 'openExternal' }
{ type: 'manualReload' }
```

### 3.4 Webview client 동작

- `serverReady` 받으면 iframe.src 세팅
- `reload` 받으면 `iframe.src = baseUrl + '?_t=' + Date.now()` (cache busting query)
  - cross-origin (vscode-webview:// ↔ http://127.0.0.1) 이라 `iframe.contentWindow.location.reload()` 불가, src 재설정 방식 사용
- `serverError` 받으면 toolbar 자리에 에러 메시지 + Retry 버튼 표시

### 3.5 Toolbar buttons (extension actions)

- **Reload** → `manualReload` 메시지 → webview 가 iframe.src 즉시 재설정
- **Edit Source** → `editSource` 메시지 → `vscode.commands.executeCommand('vscode.openWith', document.uri, 'default', ViewColumn.Beside)`
- **Open in External Browser** → `openExternal` 메시지 → `vscode.env.openExternal(vscode.Uri.parse(fullUrl))`

## 4. Package conventions

- 이름: `vibecode-browser-preview`
- Publisher: `dalsoop`
- Version: `0.1.0`
- Engines: `vscode ^1.95.0`
- Categories: `["Other"]`
- viewType: `vibecodeBrowserPreview.editor`
- customEditors selector: `[{filenamePattern: "*.html"}, {filenamePattern: "*.htm"}]`
- `activationEvents: []` (customEditor 등록만으로 활성화 트리거)
- 모노레포 표준 scripts (build / watch / sync / sync:check / typecheck / lint / format / package)

## 5. File layout

```
vibecode-browser-preview/
├── README.md
├── eslint.config.mjs
├── i18n/
│   └── ko.json                 # 3-block source of truth
├── l10n/
│   └── bundle.l10n.ko.json     # generated
├── package.json
├── package.nls.json            # generated (en)
├── package.nls.ko.json         # generated (ko)
├── scripts/
│   └── sync-nls.mjs            # i18n/ko.json → 3개 파일 emit
├── src/
│   ├── extension.ts            # activate(): register editor provider
│   ├── editor-provider.ts      # BrowserPreviewEditorProvider
│   ├── preview-server.ts       # PreviewServer (rootDir-keyed registry)
│   ├── reload-watcher.ts       # ReloadWatcher
│   ├── mime.ts                 # extension → mime mapping
│   └── webview/
│       ├── index.html.ts       # webview HTML 템플릿 (toolbar + iframe + script)
│       └── client.ts           # webview script (메시지 수신 + iframe 조작)
└── tsconfig.json
```

## 6. Security considerations

- HTTP 서버는 `127.0.0.1` 에만 바인딩 — 외부 머신에서 접근 불가
- 같은 머신의 다른 프로세스는 해당 포트로 접근 가능 — workspace 내 `.env` 등 민감 파일이 노출될 수 있음. README 에 명시적 경고
- 정적 서빙 시 path traversal 방어: `path.normalize` 후 `rootDir` 밖으로 벗어나는지 검증, escape 하면 403
- Webview CSP: `default-src 'none'; frame-src http://127.0.0.1:*; script-src 'nonce-XXX'; style-src 'unsafe-inline'`
- iframe 은 `sandbox` 속성 없이 로드 (사용자 HTML 의 JS 가 실행돼야 의미가 있음)

## 7. Manual verify checklist (post-build)

1. `.html` 파일 더블클릭 → 프리뷰가 텍스트 편집기 대신 열린다
2. 같은 폴더의 상대경로 CSS 가 적용된다 (예: `<link href="./style.css">`)
3. 상대경로 `<script src="./app.js">` 가 실행된다 (콘솔 로그 확인)
4. `<img src="./img/foo.png">` 가 렌더된다
5. `fetch('./data.json')` 이 성공한다
6. CSS 파일 저장 → 프리뷰 자동 리로드 (~200ms 후)
7. JS 파일 저장 → 프리뷰 자동 리로드
8. HTML 파일 저장 → 프리뷰 자동 리로드
9. `node_modules/` 안의 파일 저장 → 리로드 안 됨
10. **Edit Source** 버튼 → 같은 .html 이 옆에 텍스트 편집기로 열림
11. **Reload** 버튼 → 즉시 리로드
12. **Open in External Browser** 버튼 → 기본 브라우저에서 같은 URL 열림
13. 프리뷰 panel 닫음 → 다른 프리뷰 없으면 서버도 닫힘 (`lsof -i` 등으로 확인)
14. 워크스페이스 폴더 없는 상태에서 .html 열기 → 안내 메시지
15. ko / en locale 둘 다 displayName, commands, 에러 메시지 번역됨

## 8. Future work (v0.2+)

- SSE 기반 부분 리로드 (서버가 client 에 inject 한 reload script 와 연결)
- localhost dev 서버 프록시 모드 (URL 입력 시 iframe 으로 띄움)
- `.gitignore` aware reload filter
- DevTools / 콘솔 패널
- 디바이스 에뮬레이션 (viewport 크기 토글)
- 북마크 / 최근 미리본 목록
