# vibecode-vscode-extension-host-mcp-list — Design

- Date: 2026-05-25
- Status: Draft → awaiting user approval
- Target extension dir: `vibecode-vscode-extension-host-mcp-list/`

## 1. Goal

VSCode 확장 호스트에서 알 수 있는 MCP 서버를 한 군데에 모아 보여주는 사이드바 확장. 사용자가 어떤 MCP 가 어디서 왔는지 (User mcp.json / Workspace mcp.json / 설치된 확장의 contributes), 어떤 transport·port·command 로 동작하는지 한눈에 파악하고, 클릭으로 상세를 본 뒤 원본 파일/확장으로 점프할 수 있어야 한다.

## 2. Scope

### In scope
- 액티비티 바 아이콘 + 사이드바 TreeView 1개
- 데이터 소스 3종 병합 표시:
  - `~/.vscode/mcp.json`
  - 워크스페이스 `.vscode/mcp.json` (멀티 루트 지원)
  - 설치된 확장의 `package.json` 의 `contributes.mcpServerDefinitionProviders` (정적 스캔)
- 각 항목: 이름, transport (stdio/http/sse) 배지, http/sse 면 포트, stdio 면 command 경로
- 디테일 webview 패널 (env 마스킹, raw JSON, 원본 열기)
- mcp.json 변경 / 확장 install·uninstall 자동 새로고침
- i18n: ko, en

### Out of scope (YAGNI)
- MCP 서버 실제 실행 / health-check / ping
- env 값 편집 UI (mcp.json 직접 편집으로 위임)
- Claude/Cursor 등 비-VSCode mcp 설정 (`~/.claude.json`, `.cursor/mcp.json`)
- stdio args 에서 `--port` 추론
- 트리 검색박스 (트리 기본 동작으로 충분)

## 3. Architecture

### 3.1 디렉토리 구조

```
vibecode-vscode-extension-host-mcp-list/
├── package.json
├── package.nls.json / package.nls.ko.json
├── i18n/{en,ko}.json
├── l10n/bundle.l10n*.json
├── resources/activitybar.svg
├── scripts/{sync-i18n,build,package,install}.mjs
├── tsconfig.json / tsconfig.detail-client.json
└── src/
    ├── extension.ts
    ├── state.ts
    ├── _types.ts
    │
    ├── sources/
    │   ├── _types.ts
    │   ├── index.ts                 # SOURCES_REGISTRY
    │   ├── user-mcp-json/{manifest,scan,index}.ts
    │   ├── workspace-mcp-json/{manifest,scan,index}.ts
    │   └── extension-contributes/{manifest,scan,index}.ts
    │
    ├── commands/
    │   ├── _types.ts
    │   ├── index.ts                 # COMMANDS_REGISTRY
    │   ├── refresh/{manifest,handler,index}.ts
    │   ├── open-user-mcp-json/{manifest,handler,index}.ts
    │   ├── open-workspace-mcp-json/{manifest,handler,index}.ts
    │   ├── open-detail/{manifest,handler,index}.ts
    │   └── copy-command/{manifest,handler,index}.ts
    │
    └── views/
        ├── tree/{manifest,provider,items,index}.ts
        └── detail-panel/
            ├── manifest.ts
            ├── panel.ts
            ├── contracts/detail.d.ts
            └── client/{_refs.d.ts, tsconfig.detail-client.json, sections/...}
```

### 3.2 핵심 컨벤션
- `vibecode-right-click-action-open-to-file` 의 manifest-driven per-feature 폴더 패턴 차용
- `vibecode-pluggable-strategy-module` 의 constants-first ID + REGISTRY 패턴
- `vibecode-webview-architecture` 의 contracts/ + outFile + sections 패턴
- `vibecode-extension-add-activitybar-sidebar` 의 viewsContainers + views + SVG 아이콘 컨벤션

## 4. Data Model

`src/_types.ts`:

```ts
export const COMMAND_PREFIX = 'vibecodeMcpList' as const;

export const MCP_TRANSPORT = {
  STDIO: 'stdio',
  HTTP: 'http',
  SSE: 'sse',
} as const;
export type McpTransportId = typeof MCP_TRANSPORT[keyof typeof MCP_TRANSPORT];

export const MCP_ORIGIN_KIND = {
  FILE: 'file',
  EXTENSION: 'extension',
} as const;
export type McpOriginKind = typeof MCP_ORIGIN_KIND[keyof typeof MCP_ORIGIN_KIND];

export type McpOrigin =
  | { kind: typeof MCP_ORIGIN_KIND.FILE; path: string; line?: number }
  | { kind: typeof MCP_ORIGIN_KIND.EXTENSION; extensionId: string };

export interface McpServerEntry {
  name: string;
  sourceId: SourceId;
  workspaceFolder?: string;
  transport: McpTransportId;
  command?: string;
  args?: string[];
  url?: string;
  port?: number;
  env?: Record<string, string>;
  cwd?: string;
  raw: unknown;
  origin: McpOrigin;
}

export function fullCommandId(id: string): string {
  return `${COMMAND_PREFIX}.${id}`;
}
```

`src/sources/_types.ts`:

```ts
export const MCP_SOURCE = {
  USER_MCP_JSON: 'user-mcp-json',
  WORKSPACE_MCP_JSON: 'workspace-mcp-json',
  EXTENSION_CONTRIBUTES: 'extension-contributes',
} as const;
export type SourceId = typeof MCP_SOURCE[keyof typeof MCP_SOURCE];

export interface SourceManifest {
  id: SourceId;
  labelKey: string;
  order: number;
}

export interface SourceModule {
  manifest: SourceManifest;
  scan: () => Promise<McpServerEntry[]>;
  watch?: (onChange: () => void) => vscode.Disposable;
}
```

`src/sources/index.ts`:

```ts
export const SOURCES_REGISTRY: Record<SourceId, SourceModule> = {
  [MCP_SOURCE.USER_MCP_JSON]: userMcpJson,
  [MCP_SOURCE.WORKSPACE_MCP_JSON]: workspaceMcpJson,
  [MCP_SOURCE.EXTENSION_CONTRIBUTES]: extensionContributes,
};
export const ALL_SOURCES: readonly SourceModule[] = Object.values(SOURCES_REGISTRY);
```

`src/commands/_types.ts`:

```ts
export const MCP_COMMAND = {
  REFRESH: 'refresh',
  OPEN_USER_MCP_JSON: 'openUserMcpJson',
  OPEN_WORKSPACE_MCP_JSON: 'openWorkspaceMcpJson',
  OPEN_DETAIL: 'openDetail',
  COPY_COMMAND: 'copyCommand',
} as const;
export type CommandId = typeof MCP_COMMAND[keyof typeof MCP_COMMAND];

export interface CommandContext {
  state: McpState;
  args: unknown[];
}

export interface CommandModule {
  manifest: { id: CommandId; title: string; icon?: string };
  handler: (ctx: CommandContext) => unknown | Promise<unknown>;
}
```

## 5. Source Scanning

### 5.1 `user-mcp-json`
- 경로: `~/.vscode/mcp.json`. 없으면 빈 배열.
- 파서: `jsonc-parser` (코멘트/트레일링 콤마 허용)
- 스키마(VSCode 공식): `{ "servers": { "<name>": <ServerDef> } }`
  - stdio: `{ command, args?, env?, cwd? }`
  - http/sse: `{ url, type?: 'sse' | 'http', headers? }`
- watch: `vscode.workspace.createFileSystemWatcher(GlobPattern over absolute path)`

### 5.2 `workspace-mcp-json`
- `vscode.workspace.workspaceFolders` 순회 → 폴더별 `.vscode/mcp.json`
- 각 entry 에 `workspaceFolder` 채움
- watch: `createFileSystemWatcher('**/.vscode/mcp.json')`

### 5.3 `extension-contributes`
- `vscode.extensions.all` 순회
- `extension.packageJSON.contributes?.mcpServerDefinitionProviders` 가 배열이면 각 entry → `McpServerEntry`
  - `name` 후보: `label` ?? `id`
  - origin: `{ kind: 'extension', extensionId }`
  - transport 정보가 정적으로 없을 수도 있음 → 그 경우 transport=stdio, command 미상, "registered via API" 라벨
- watch: `vscode.extensions.onDidChange(...)`

### 5.4 `parseTransport(raw)` helper
- `raw.command` 있음 → `{ transport: STDIO, command, args }`
- `raw.url` 있음 → URL 파싱 → `transport ∈ {HTTP, SSE}` + `port`
- 둘 다 없음 → `{ transport: STDIO, command: undefined }`

## 6. TreeView

### 6.1 그룹
- 그룹: `SourceManifest.order` 오름차순 (User=0, Workspace=1, Extension=2)
- 그룹 라벨:
  - User: `User`
  - Workspace: `Workspace · ${folderName}` (멀티 루트 시 폴더별로 별개 그룹)
  - Extension: `Extension`
- 빈 그룹은 숨김 (해당 소스의 entry 가 0개면 그룹 노드 자체 미생성)

### 6.2 항목 표시
- `label`: `entry.name`
- `description`: `${transport} · ${transport === STDIO ? basename(command) : ':' + port}`
- `tooltip`: MarkdownString — name, transport, command/url 풀, cwd, env keys, origin
- `iconPath`: codicon — stdio: `terminal`, http: `globe`, sse: `radio-tower`
- `contextValue`: `mcpServerItem`
- `command`: `vibecodeMcpList.openDetail` with entry

### 6.3 파싱 에러
- mcp.json 파싱 실패 → 트리에 error 항목 (`iconPath: error`, tooltip=메시지, 클릭=해당 줄 점프)

## 7. Commands

| ID | Trigger | Action |
|---|---|---|
| `refresh` | view/title nav, palette | 모든 소스 병렬 scan |
| `openUserMcpJson` | view/title `...` | `~/.vscode/mcp.json` 열기 (없으면 `{servers:{}}` 로 생성) |
| `openWorkspaceMcpJson` | view/title `...` | 폴더 0=토스트("No workspace folder open") 후 종료, 1=바로 열기, 다=QuickPick. 메뉴 visibility 는 `when: workspaceFolderCount > 0` 로 추가 게이팅 |
| `openDetail` | tree item click | 디테일 패널 열기/업데이트 |
| `copyCommand` | tree item context | stdio: `command + args.join(' ')`, http/sse: `url` 클립보드 복사 |

## 8. Detail Panel (Webview)

- 위치: `viewColumn: Beside`
- 싱글톤: 이미 열려 있으면 `reveal` + `postMessage({ type: 'setEntry', entry })`
- 타이틀: `MCP · ${entry.name}`

### 8.1 레이아웃
- 헤더: 이름 + transport 배지 + sourceLabel · originLabel
- 헤더 우측 액션: Open source / Copy command / Refresh
- 본문 카드: Command (or URL), Working directory, Environment (마스킹 + per-key show 토글), Raw JSON (collapsible)

### 8.2 ext↔webview contract (`contracts/detail.d.ts`)

```ts
declare namespace DetailContract {
  type Inbound =
    | { type: 'setEntry'; entry: SerializedMcpEntry }
    | { type: 'theme'; isDark: boolean };

  type Outbound =
    | { type: 'ready' }
    | { type: 'openSource' }
    | { type: 'copyCommand' }
    | { type: 'refresh' }
    | { type: 'revealEnvKey'; key: string };

  interface SerializedMcpEntry {
    name: string;
    sourceLabel: string;
    transport: 'stdio' | 'http' | 'sse';
    command?: string;
    args?: string[];
    url?: string;
    port?: number;
    cwd?: string;
    env?: Record<string, string>;
    rawJson: string;
    originLabel: string;
  }
}
```

### 8.3 보안
- env 기본 마스킹, per-key show 토글
- `webview.options.localResourceRoots` = `dist/` 만
- CSP: `default-src 'none'; style-src ${cspSource}; script-src ${cspSource}; img-src ${cspSource} data:`

### 8.4 클라이언트 분할
- `client/sections/00-bootstrap.ts` — `acquireVsCodeApi()`, state
- `client/sections/10-render.ts` — `render(entry)`
- `client/sections/20-actions.ts` — 버튼 → postMessage
- `client/sections/99-init.ts` — message listener + `postMessage({type:'ready'})`
- `tsconfig.detail-client.json` outFile=`../../../dist/detail-client.js` + `<reference path>` 순서로 IIFE namespace 묶기

## 9. Lifecycle

`src/extension.ts`:

1. `McpState` 인스턴스 생성 (`ALL_SOURCES` 주입)
2. TreeView 등록 + `state.onDidChange` → `provider.refresh()`
3. `ALL_COMMANDS` 루프 등록 (handler 에 `CommandContext` 주입)
4. `ALL_SOURCES` 의 `watch?.(onChange)` 부착 → `state.refreshSource(id)`
5. DetailPanel serializer 등록
6. `state.refreshAll()` 초기 스캔

`src/state.ts`:

- `cache: Map<SourceId, McpServerEntry[]>`
- `refreshAll() / refreshSource(id)` — 실패한 소스는 빈 배열 + 토스트 1회, 다른 소스는 영향 없음
- `_onDidChange` EventEmitter

## 10. Activation & package.json contributions

- `engines.vscode`: `^1.90.0`
- `activationEvents`: `onView:vibecodeMcpList.tree`
- `contributes.viewsContainers.activitybar`: `id: vibecode-mcp-list`, icon=`resources/activitybar.svg`
- `contributes.views.vibecode-mcp-list`: `id: vibecodeMcpList.tree`
- `contributes.commands`: 5개 (MCP_COMMAND 값과 1:1)
- `contributes.menus`:
  - `view/title`: refresh (navigation), openUser/openWorkspace (`...` group)
  - `view/item/context`: copyCommand (`when: viewItem == mcpServerItem`)

## 11. i18n

- `package.nls{,.ko}.json` — package.json 의 displayName, command title, view container/view title
- `i18n/{en,ko}.json` — 런타임 사용자 메시지: 그룹 라벨, 빈 상태, 에러 메시지
- `scripts/sync-i18n.mjs` → `l10n/bundle.l10n{,.ko}.json` 생성
- 런타임은 `vscode.l10n.t(...)` 사용

## 12. Dependencies

- 런타임: `jsonc-parser` (esbuild 번들로 인라인)
- 개발: `@types/vscode`, `@types/node`, `typescript`, `eslint`, `@vscode/vsce`, `esbuild`

## 13. Build & Package

- `scripts/sync-contributions.mjs` (manifest → package.json + nls) → `scripts/build-ext.mjs` (esbuild 로 `dist/extension.js` 번들 + `dist/parse.js` 테스트용 부산물) → `tsc -p tsconfig.detail-client.json` (webview client outFile) → `vsce package --no-dependencies` → `code --install-extension`
- `vibecode-build-release-runner` 스킬로 실제 실행
- **esbuild 옵션 `mainFields: ['module', 'main']` 필수** — `jsonc-parser` UMD 빌드의 동적 require 가 정적 분석 안 됨; ESM 엔트리로 강제해야 인라인 가능. 자세한 내용 `vibecode-extension-testing` 스킬 §Pitfalls 참조.

## 14. Testing

두 층. `vibecode-extension-testing` 스킬 참조.

### 14.1 단위 (필수, 본 v0.1 범위)
- `tests/parse.test.mjs` — `parseTransport` + `parseMcpJson` 헬퍼 (fixture jsonc 포함, 9개)
- `tests/activation.test.mjs` — **활성화 스모크 테스트**. stub 된 `vscode` 모듈로 `dist/extension.js` 의 `activate()` 를 호출, 다음을 검증:
  - throw 없이 완주
  - `vibecodeMcpList.tree` 에 TreeDataProvider 등록
  - 5개 command 모두 `registerCommand` 됨
- 러너: `node --test tests/*.test.mjs` (zero-dep, node ≥ 20)

이 스모크 테스트가 0.1.0 의 `jsonc-parser` 누락 같은 번들 깨짐을 활성화 단계에서 잡는다. CLI typecheck/lint 만으로는 못 잡음.

### 14.2 통합 (선택, MVP 범위 외)
TreeView 실제 렌더링, webview 동작 검증은 `@vscode/test-electron` 추가 시 가능. v0.1 범위에서는 안 함 (수동 검증).

## 15. Done Criteria

1. 액티비티 바에 아이콘 노출
2. 트리에 User / Workspace / Extension 그룹 + 항목 노출
3. 각 항목 description 에 transport 배지 + (port or stdio basename), tooltip 에 풀 정보
4. mcp.json 변경 / 확장 install·uninstall → 자동 새로고침
5. 항목 클릭 → 디테일 패널 (env 마스킹, raw JSON, 원본 열기 버튼)
6. 우클릭 → copy command 동작
7. 타이틀바 메뉴에서 User/Workspace mcp.json 열기 동작
8. `i18n/{en,ko}` 양쪽 채워짐, `sync-i18n.mjs` 통과
9. `vsce package` 성공 + 로컬 install 성공
