# vibecode-browser-preview-pro v0.5 — Design

날짜: 2026-05-25 / 대상: v0.4.0 → v0.5.0 / UI 정리 릴리스.

## Goal

v0.4 직후 사용자 피드백 — 패널 구조가 어수선하고 이모지/유니코드 글리프가 VSCode UI 톤과 안 맞음. 다섯 가지 UI 정리:

1. **Codicons 통합** — VSCode 네이티브 아이콘 폰트 (@vscode/codicons) 도입, 모든 emoji/glyph 교체
2. **3-tab 구조** — Pins / Changes / Assets (Assets 가 탭 밖에 세로로 쌓여있던 것을 탭 안으로). Snapshot hint 는 footer
3. **Force-state chip** — 체크박스 4개 → 1줄 button-chip 토글 (`aria-pressed`)
4. **panel-warning × 닫기** — cross-origin 경고를 한 번 읽고 닫을 수 있게 (sessionStorage)
5. **Device select 우측 끝 고정** — URL 라벨이 늘면 select 위치도 흔들리던 것을 anchor

모두 webview HTML/CSS/JS + 익스텐션 호스트 측 codicon 자산 wiring 만. 백엔드 (snapshot, force-state-script, preview-server) 변경 없음.

## Architecture

### Codicons 통합

- `@vscode/codicons` npm dep 추가
- `scripts/copy-codicons.mjs` — `npm run build` 시 `node_modules/@vscode/codicons/dist/{codicon.css,codicon.ttf}` 를 `dist/codicons/` 로 복사
- `BrowserPreviewEditorProvider` 가 `extensionUri` 저장 + `localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'dist')]` 설정
- `webview.asWebviewUri(codicon.css)` 를 `buildHtml(webview, l10n, codiconCssUri)` 로 전달
- HTML head 에 `<link rel="stylesheet" href="${codiconCssUri}">` + CSP `font-src ${cspSource};` 추가
- 사용: `<span class="codicon codicon-<name>"></span>`

### 매핑 테이블

| 위치 | 현재 | v0.5 |
|---|---|---|
| Toolbar Reload/Edit/Open/Inspector/Save | `↻📝↗🎯💾` | `codicon-refresh/edit/link-external/inspect/save` |
| Pin card Copy / Unpin | `📋🗑` | `codicon-copy/trash` |
| ▲N badge (tab + pin) | `▲N` | `N` (숫자만, 배지 색이 상태 전달) |
| panel-warning close | (없음) | `codicon-close` |

### 패널 구조 변경 (v0.4 → v0.5)

```
v0.4:                          v0.5:
<aside class="panel">          <aside class="panel">
  [Pins][Changes]                [Pins][Changes][Assets]
  warning                        warning [×]
  pins-list / changes-list       pins-list / changes-list / assets-list
  <section> Assets </section>    footer: snapshot hint
  <section> hint </section>    </aside>
</aside>
```

- 3번째 탭 (`tabpanel-assets`) — 자산 카운트 자동 갱신
- panel: `display:none → display:flex; flex-direction:column;` (visible) — footer 의 `margin-top:auto` 작동
- snapshot hint 는 panel-footer (1줄, italic, gray, centered)

### Force-state chip

- 4 `<input type="checkbox">` → 4 `<button type="button" aria-pressed="false">` chip
- `:focus-visible` 라벨은 `:focus-vis` 로 축약 (전체 이름은 title)
- on: 채워진 배경 (vscode-button-background)
- off: 테두리만
- 한 줄 유지: `display: flex; overflow-x: auto;`

### panel-warning × dismiss

- 내부 구조: `<span id="panel-warning-text"></span>` + `<button id="panel-warning-close"><codicon-close></button>`
- × 클릭: hidden + `sessionStorage.setItem('bp:warning-dismissed', '1')`
- force-state-scan 메시지 수신 시 dismissed 플래그 확인 → 다시 표시 안 함
- Reload Window 시 sessionStorage 비워지므로 다시 표시 (의도)

### Device select 우측 끝

- toolbar 순서: `[btn-reload][btn-edit][btn-open][btn-inspector][btn-save][url-label][device-label]`
- url label: `flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis;`
- device label: `flex: 0 0 auto; margin-left: 8px;`

## Versioning

- `package.json` 0.4.0 → 0.5.0
- README v0.5 shipped 섹션 추가 + 한계 (v0.4) → (v0.5)
- l10n 신규 키 1개: `Dismiss` / `닫기`

## Non-Goals (v0.6+)

- 핀 영속화, snapshot 비교, 요소 스크린샷
- 디바이스 회전, custom width
- Codicons 외 다른 icon set
