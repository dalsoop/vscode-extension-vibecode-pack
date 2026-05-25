# vibecode-extension-menu-list

상태바의 **`V` 버튼 클릭 → 에디터 옆에 Walkthrough 스타일 webview 패널이 슬라이드인**. 설치된 모든 vibecode-* 확장과 각 command 를 카드로 표시. 카드 클릭 → 즉시 실행.

```
┌─────────────────────────────────────────────────────────┐
│  [Editor]                  │  VIBECODE 확장              │
│                            │                             │
│                            │  🔍 명령 필터…              │
│                            │                             │
│                            │  ── COMMIT LINT ──────────  │
│                            │  ┃ 템플릿으로 초기화        │
│                            │     vibecodeCommitLint…     │
│                            │  ┃ 직전 커밋 검사           │
│                            │     vibecodeCommitLint…     │
│                            │                             │
│                            │  ── AGENT INIT ───────────  │
│                            │  ┃ 여기에 에이전트 템플릿…  │
│                            │     vibecodeAgentInit…      │
│                            │                             │
├────────────────────────────┴─────────────────────────────┤
│  🏠 main  ✕ 0  ⚠ 0                       🚀 Vibecode    │  ← 상태바 우측
└──────────────────────────────────────────────────────────┘
```

## 트리거 (3가지 동등)

| Trigger | 동작 |
|---|---|
| 상태바 우측 **`🚀 Vibecode`** 버튼 클릭 | Webview 패널을 `ViewColumn.Beside` 로 오픈 (이미 열려있으면 포커스) |
| 팔레트 → `Vibecode - Open Side Panel` | 동일 |
| 팔레트 → `Vibecode - Show Extension Menu Catalog (QuickPick)` | 동일 데이터를 QuickPick 으로 — 타이핑 필터링, 키보드 워크플로우 |

## Webview 패널 UX

- **카드 그리드**: 확장별 섹션 → 각 카드 = command (제목 + 실제 commandId)
- **상단 필터**: 입력 즉시 매칭 (제목/카테고리/commandId/확장명 검색). 매칭 없는 섹션 자동 숨김
- **새로고침 버튼**: 우상단 — 카탈로그 재스캔
- **자동 새로고침**: `vscode.extensions.onDidChange` 구독 → 다른 확장 설치/제거 시 패널 즉시 갱신
- **`retainContextWhenHidden`**: 다른 탭 갔다 와도 스크롤/필터 상태 유지
- **VSCode 테마 변수 사용**: 다크/라이트/하이콘트라스트 모두 자동 대응

## 어떻게 동작하나

- `vscode.extensions.all` 에서 **이름 부분이 `vibecode-` 로 시작**하는 확장만 골라냄. publisher 무관 (`dalsoop.vibecode-foo`, `<anyone>.vibecode-bar` 둘 다 잡힘). 자기 자신은 제외.
- 각 확장의 `package.json` 에서 `contributes.commands` 를 읽음
- 라벨이 `%nls.key%` 형태면 그 확장의 `package.nls.<locale>.json` / `package.nls.json` 을 디스크에서 읽어 해석
- 카드 클릭 → webview 가 `postMessage({type:'run', commandId})` → extension 이 `vscode.commands.executeCommand(commandId)` 로 실행

## 다른 publisher 의 vibecode-* 확장도 잡으려면

조건은 **확장 id (`<publisher>.<name>`) 의 `<name>` 부분이 `vibecode-` 로 시작**하는 것 하나. 별도 등록/manifest/협의 일절 불필요 — 설치만 되어 있으면 패널에 자동으로 노출됨.

## 아키텍처

```
vibecode-extension-menu-list/
├── package.json                          # contributes.{commands,menus} 자동 생성
├── package.nls.json / package.nls.ko.json
├── i18n/ko.json                          # ext + commands + runtime
├── l10n/bundle.l10n.ko.json
├── resources/vibecode.svg                # webview 패널 탭 아이콘
├── scripts/{sync-contributions.mjs, nls-defaults.json}
└── src/
    ├── extension.ts                      # 상태바 등록 + SidePanel 초기화 + app 명령 등록
    ├── catalog.ts                        # loadCatalog() — vibecode-* 확장 + NLS 해석
    ├── side-panel.ts                     # SidePanel 클래스 — webview lifecycle + HTML 렌더
    └── apps/
        ├── _types.ts                     # AppManifest, AppContext, VIBECODE_NAME_PREFIX
        ├── index.ts
        ├── open-side-panel/{manifest,handler,index}.ts  # 패널 열기 (상태바 + 팔레트)
        ├── show-catalog/{manifest,handler,index}.ts     # QuickPick 카탈로그 (팔레트만)
        └── run-command/{manifest,handler,index}.ts      # (palette: false, 현재 미사용)
```

## 개발

```bash
npm install
npm run build       # sync → tsc
npm run typecheck
npm run lint
npm run sync        # package.json + nls 재생성
npm run sync:check  # CI 게이트
npm run package     # .vsix
```
