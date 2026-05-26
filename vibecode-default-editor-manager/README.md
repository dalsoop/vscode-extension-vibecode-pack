# vibecode-default-editor-manager

VSCode 의 [`workbench.editorAssociations`](https://code.visualstudio.com/docs/getstarted/settings#_default-language-association) 설정을 사이드바에서 시각적으로 관리하는 확장.

좌측 activity bar 의 **V (Vibecode)** 아이콘 클릭 → 사이드바 슬라이드 오픈 → **Default Editor** 뷰.

## 동작

세 섹션:

1. **Current Mappings** — 현재 적용 중인 `pattern → viewType` 매핑 리스트.
   - 각 줄에 패턴 / 에디터 이름(NLS 해석된) / 출처 scope (`[workspace]` / `[user]` / `[default]`) / Remove 버튼
   - `default` scope (VSCode 가 기본으로 박은 매핑) 은 Remove 불가
2. **Add Mapping** — 패턴 입력 + 에디터 드롭다운 + Add 버튼
   - 드롭다운: `default` (내장 텍스트 에디터) + 설치된 모든 커스텀 에디터 (`displayName — viewType` 포맷)
   - Add 누르면 **scope 선택 QuickPick** 뜸 (Workspace / User) → settings.json 자동 업데이트
3. **Installed Custom Editors** — 설치된 확장이 contributes 한 모든 커스텀 에디터를 출처별로 그룹핑
   - 확장명 / viewType / 셀렉터 글롭들 / priority

## 매핑 동작 (VSCode 내부 규칙)

- `workbench.editorAssociations` 는 `Record<glob, viewType>` 형태
- VSCode 가 파일을 열 때 가장 specific 한 매칭 글롭을 골라 그 viewType 으로 연다
- viewType 이 `default` 면 내장 텍스트 에디터가 강제됨
- 동일 패턴이 user 와 workspace 양쪽에 있으면 workspace 가 우선

## 우회

- 사이드바를 안 쓰고 직접 만지고 싶으면 우측 상단 **raw 설정 열기** → Settings UI 의 `workbench.editorAssociations` 항목으로 점프
- 한 파일만 다른 에디터로 열고 싶으면 VSCode 표준 **Open With…** 우클릭 메뉴 사용 (이 확장은 글로벌 매핑 전용)

## 아키텍처

```
vibecode-default-editor-manager/
├── package.json                  # viewsContainers.activitybar.vibecode + views.vibecode.<id>
├── package.nls.json              # 자동 생성
├── package.nls.{en,ko}.json      # 자동 생성
├── i18n/
│   ├── en.json                   # { ext, viewContainers, views, runtime }
│   └── ko.json
├── l10n/
│   └── bundle.l10n.{en,ko}.json  # 자동 생성
├── scripts/
│   ├── build-ext.mjs             # esbuild 번들
│   ├── sync-contributions.mjs    # apps + i18n → package.json + NLS
│   └── nls-defaults.json
├── resources/
│   └── vibecode.svg              # activity bar 아이콘 (V — 다른 vibecode-* 확장과 공유)
└── src/
    ├── extension.ts              # WebviewViewProvider 등록
    ├── sidebar-provider.ts       # HTML/CSS/JS 모두 + 메시지 핸들러
    ├── registry.ts               # vscode.extensions.all → customEditors 발굴 + NLS 해석
    ├── associations.ts           # workbench.editorAssociations read/write + scope picker
    └── apps/
        ├── _types.ts             # COMMAND_PREFIX = 'vibecodeDefaultEditor'
        └── index.ts              # 빈 배열 — 명령 없음 (sidebar-only)
```

### 공유하는 activity bar 컨테이너

다른 vibecode-* 사이드바 확장들 (`vibecode-extension-menu-list`, `vibecode-skills-viewer` 등) 과 **같은 `vibecode` viewsContainer 를 declare** 함. → VSCode 가 자동 union → V 아이콘 하나에 여러 뷰가 쌓임. 둘 다 설치되어 있으면 같은 activity bar 슬롯에서 wbeview 가 차곡차곡.

### 데이터 흐름

```
extension load
  ↓
WebviewViewProvider 등록 (vibecodeDefaultEditor.sidebar)
  ↓
사용자가 V 아이콘 클릭
  ↓
resolveWebviewView() → render()
  ├── loadCustomEditors()   ← vscode.extensions.all 전수조사
  └── readMappings()        ← workspace.getConfiguration().inspect()
  ↓
HTML 빌드 → webview.html = ...
  ↓
사용자 액션 → postMessage → handle...() → pickScope() → config.update()
  ↓
onDidChangeConfiguration / onDidChange(extensions) → render() 재실행
```

## 개발

```bash
cd vibecode-default-editor-manager
npm install
npm run build       # sync → esbuild bundle
npm run typecheck
npm run lint
npm run sync:check  # CI 게이트
npm run package     # .vsix
```

## v0.1 한계

- 내장 `default` / `imageEditor` / notebook providers 는 드롭다운에 없음 (사용자 요청대로 — customEditors 만)
- WorkspaceFolder scope (multi-root) 미지원 — Workspace / User 두 단계만
- 매핑 inline 편집은 불가, Remove 후 다시 Add 로 진행
- 패턴 검증 없음 — VSCode 가 거부하면 settings.json 에 그대로 들어가 비활성 상태로 남을 수 있음
