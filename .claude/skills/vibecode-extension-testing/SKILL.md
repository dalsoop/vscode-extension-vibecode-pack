---
name: vibecode-extension-testing
description: "vibecode-* 확장에 자동 테스트를 추가한다 — 빠른 단위 테스트(스텁된 vscode 모듈) + 진짜 VSCode 에서 도는 통합 테스트(@vscode/test-electron). esbuild 번들이 빠뜨리는 런타임 require 누락을 활성화 단계에서 잡는다. Use when: 새 vibecode-* 확장에 테스트를 셋업하거나, 기존 확장에서 'activate 가 조용히 실패'한 정황이 있을 때 (e.g., '데이터 공급자 없음', '확장이 안 켜진다', '테스트 자동화 붙이자')."
---

# Vibecode Extension Testing

vibecode-* 확장에 두 층의 자동 테스트를 붙이는 에이전트.

## 왜 필요한가 (실제 사례)

`vibecode-vscode-extension-host-mcp-list 0.1.0` 은 다음 시나리오로 실패했다:

1. `package.json` 에 `jsonc-parser` 가 `dependencies` 로 들어감
2. `vsce package --no-dependencies` 가 `node_modules` 를 빼고 패키징
3. 설치 후 VSCode 가 활성화 시도 → `require('jsonc-parser')` → `MODULE_NOT_FOUND` → `activate()` throw
4. TreeDataProvider 등록 코드까지 가지 못함 → 사이드바에 "보기 데이터를 제공할 수 있는 등록된 데이터 공급자가 없습니다"

`tsc` / `eslint` / parse 헬퍼 단위 테스트는 전부 통과했다. **활성화를 실제로 트리거하는 테스트가 없었기 때문에** 빌드 산출물의 런타임 에러를 못 잡았다.

→ 이 스킬의 활성화 스모크 테스트가 있었으면 CI 단계에서 잡혔을 버그.

## 두 층의 테스트

### Layer 1: 활성화 스모크 (단위, ~100ms)

`vscode` 모듈을 stub 한 채 `dist/extension.js` 를 `require()` 해서 `activate(fakeContext)` 를 호출. 다음을 검증:

- `activate()` 가 throw 없이 완주
- 선언된 모든 view id 에 TreeDataProvider 등록됨
- 선언된 모든 command 가 `registerCommand` 됨

**놓치는 것**: 실제 UI 렌더링, webview 동작, 워크스페이스 상호작용.

**잡는 것**: 런타임 모듈 누락 (이번 jsonc-parser 같은), 번들 깨짐, manifest ↔ 코드 ID 불일치, registry exhaustiveness.

### Layer 2: 통합 테스트 (E2E, ~수십 초)

`@vscode/test-electron` + `@vscode/test-cli` 로 실제 VSCode 를 다운받아 Extension Development Host 에서 실행. 진짜 `vscode` API 호출.

**잡는 것**: UI 표시, command 실행 결과, webview 메시지, 워크스페이스 통합.

**비용**: 다운로드 캐시 후에도 매 실행 수십 초. CI 에서만 돌리고 로컬은 Layer 1 만 돌리는 게 보통.

## How to apply

You add Layer 1 (always) and optionally Layer 2 (when the extension has non-trivial UI behavior) to a vibecode-* extension.

### Repo context

- Mono repo: `/Users/jeonghan/Documents/WORK/WORKSPACE/apps/vscode-extension-mono/`
- Reference impl: `vibecode-vscode-extension-host-mcp-list/tests/activation.test.mjs` (Layer 1 stub-based test)
- Runner: `node --test tests/*.test.mjs` — zero deps, ships with node ≥ 20
- Build: esbuild 로 번들 (skills-viewer 패턴) — `dist/extension.js` 단일 파일

### Layer 1 recipe — Activation smoke test

Add to `<ext>/tests/activation.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Module from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXTENSION_JS = join(__dirname, '..', 'dist', 'extension.js');

function makeStubVscode() {
  const registered = { trees: new Map(), commands: new Map(), watchers: [] };

  class Disposable {
    constructor(cb) { this._cb = cb; }
    dispose() { if (this._cb) this._cb(); }
    static from(...d) { return new Disposable(() => d.forEach(x => x?.dispose?.())); }
  }
  class EventEmitter {
    constructor() { this._listeners = []; this.event = (fn) => { this._listeners.push(fn); return new Disposable(() => {}); }; }
    fire(arg) { this._listeners.forEach(fn => fn(arg)); }
    dispose() { this._listeners = []; }
  }
  class TreeItem {
    constructor(label, state) { this.label = label; this.collapsibleState = state; }
  }
  class ThemeIcon { constructor(id) { this.id = id; } }
  class MarkdownString { constructor(v) { this.value = v ?? ''; } appendMarkdown(v) { this.value += v; return this; } }
  class RelativePattern { constructor(base, pattern) { this.base = base; this.pattern = pattern; } }
  class Uri {
    static file(p) { return { fsPath: p, scheme: 'file', toString: () => `file://${p}` }; }
    static joinPath(base, ...parts) { return { fsPath: [base.fsPath, ...parts].join('/'), scheme: 'file' }; }
  }
  const watcher = { onDidChange: () => new Disposable(), onDidCreate: () => new Disposable(), onDidDelete: () => new Disposable(), dispose: () => {} };

  return {
    Disposable, EventEmitter, TreeItem,
    TreeItemCollapsibleState: { None: 0, Collapsed: 1, Expanded: 2 },
    ThemeIcon, MarkdownString, RelativePattern, Uri,
    ViewColumn: { Beside: -2, One: 1 },
    window: {
      createTreeView: (id, opts) => { registered.trees.set(id, opts.treeDataProvider); return new Disposable(); },
      createWebviewPanel: () => { throw new Error('not used in activation test'); },
      showWarningMessage: () => {}, showErrorMessage: () => {}, showInformationMessage: () => {},
      setStatusBarMessage: () => {}, showQuickPick: async () => undefined,
    },
    commands: {
      registerCommand: (id, h) => { registered.commands.set(id, h); return new Disposable(); },
      executeCommand: async () => {},
    },
    workspace: {
      workspaceFolders: undefined,
      createFileSystemWatcher: () => watcher,
      onDidChangeWorkspaceFolders: () => new Disposable(),
      openTextDocument: async (p) => ({ uri: Uri.file(p) }),
    },
    extensions: { all: [], onDidChange: () => new Disposable() },
    env: { clipboard: { writeText: async () => {} } },
    l10n: { t: (s, ...args) => args.length ? String(s).replace(/\{(\d+)\}/g, (_, i) => String(args[i])) : String(s) },
    _registered: registered,
  };
}

test('extension activates and registers expected providers/commands', async () => {
  const stub = makeStubVscode();
  const originalResolve = Module._resolveFilename;
  Module._resolveFilename = function(request, parent, ...rest) {
    if (request === 'vscode') return 'vscode';
    return originalResolve.call(this, request, parent, ...rest);
  };
  const originalLoad = Module._load;
  Module._load = function(request, parent, ...rest) {
    if (request === 'vscode') return stub;
    return originalLoad.call(this, request, parent, ...rest);
  };

  try {
    const { createRequire } = await import('node:module');
    const req = createRequire(import.meta.url);
    delete req.cache[EXTENSION_JS];
    const ext = req(EXTENSION_JS);
    await ext.activate({ subscriptions: [], extensionUri: stub.Uri.file('/tmp/fake-ext') });

    // Customize per extension:
    assert.ok(stub._registered.trees.has('<your-view-id>'));
    for (const cmd of ['<your.cmd1>', '<your.cmd2>']) {
      assert.ok(stub._registered.commands.has(cmd), `${cmd} must be registered`);
    }
  } finally {
    Module._resolveFilename = originalResolve;
    Module._load = originalLoad;
  }
});
```

`package.json` 의 `scripts.test`:
```
"test": "node --test tests/*.test.mjs"
```

### Layer 1 — stub 보강이 필요한 경우

확장이 활성화 중에 호출하는 vscode API 가 stub 에 없으면 throw. 그때마다 stub 에 메서드/속성 추가. 흔한 보강:
- `vscode.languages.registerHoverProvider` 등 추가 register* 가 있으면 `registered` 맵에 흡수
- `vscode.workspace.getConfiguration(section)` → 빈 `get/has/inspect/update` 객체 반환
- `vscode.window.onDidChangeActiveTextEditor` → `() => new Disposable()`

stub 은 "최소한이지만 activate 가 throw 하지 않을 만큼" 만. 깊이 안 가도 됨.

### Layer 2 recipe — @vscode/test-electron 통합 테스트

선택 사항. UI 동작 검증이 필요한 확장만 추가.

```bash
npm install --save-dev @vscode/test-cli @vscode/test-electron mocha @types/mocha
```

`<ext>/.vscode-test.mjs`:
```js
import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
  files: 'dist/test/**/*.test.js',
  workspaceFolder: './test-fixtures',  // 선택: 테스트용 워크스페이스
  mocha: { ui: 'tdd', timeout: 20_000 },
});
```

`<ext>/src/test/extension.test.ts`:
```ts
import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension integration', () => {
  test('activates on view open', async () => {
    const ext = vscode.extensions.getExtension('dalsoop.<your-ext-name>');
    assert.ok(ext);
    await ext!.activate();
    assert.strictEqual(ext!.isActive, true);
  });

  test('command executes', async () => {
    await vscode.commands.executeCommand('<your.cmd>');
    // assert observable side effect
  });
});
```

`package.json`:
```
"scripts": {
  "test:unit": "node --test tests/*.test.mjs",
  "test:integration": "vscode-test",
  "test": "npm run test:unit && npm run test:integration"
}
```

`tsconfig.json` 의 `exclude` 에 통합 테스트가 esbuild 번들 entry 에 끼지 않도록 분리. (보통 src/test/* 는 별도 tsc 로 → dist/test/*.)

## Pitfalls (모노레포 특이사항)

### A) jsonc-parser 같은 UMD 패키지 + esbuild

UMD 번들은 함수 안에서 `require('./impl/...')` 같은 동적 호출을 한다. esbuild 가 정적 분석 못 해서 런타임에 `MODULE_NOT_FOUND` 발생.

**Fix**: `scripts/build-ext.mjs` 의 esbuild 옵션에 `mainFields: ['module', 'main']` 추가. 패키지의 ESM 엔트리를 쓰게 강제하면 정적 import 라 esbuild 가 따라간다.

### B) `vsce package --no-dependencies`

monorepo 컨벤션상 패키징은 항상 `--no-dependencies` (skills-viewer 패턴). 즉 `node_modules` 가 vsix 에 안 들어간다. 그래서 **모든 런타임 import 는 번들에 인라인되어야 한다** — esbuild `bundle: true` 필수.

### C) 테스트용 dist 와 런타임 dist 의 분리

런타임 bundle 은 `dist/extension.js` 하나. 단위 테스트가 `parse.ts` 같은 헬퍼만 따로 import 하고 싶으면, esbuild 에서 별도 entry 로 한 번 더 빌드해서 `dist/parse.js` 같은 부산물을 만든다 (예: mcp-list 의 `scripts/build-ext.mjs` 가 두 entry 를 평행 빌드).

테스트 부산물은 외부 deps 를 `external` 로 두는 게 깔끔 (예: jsonc-parser 는 node_modules 에서 resolve). 런타임 bundle 만 deps 인라인.

### D) `code --install-extension` 후 reload

설치 직후에는 VSCode 가 옛 버전의 extension.js 를 메모리에 들고 있다. `Cmd+Shift+P` → "Developer: Reload Window" 안 하면 새 코드 안 돈다. 사용자가 "안 켜진다" 하면 가장 먼저 reload 확인.

### E) `package.json` 의 view 추가 vs `extension.ts` 의 provider 등록 불일치

`contributes.views` 에 새 view id 를 추가해놓고 `extension.ts` 에서 `createTreeView(id, ...)` 안 하면 "데이터 공급자 없음" 에러. Layer 1 의 활성화 스모크가 잡는다 — 모든 declared view 가 provider 등록되었는지 assert.

진단: `package.json` 의 `contributes.views.*.[].id` 들을 모아서 activate 후 stub `_registered.trees` 와 비교하는 assertion 추가.

## Process

1. **확장 디렉토리에서 시작**: `cd vibecode-<name>`.
2. **`tests/activation.test.mjs` 추가**: 위 레시피 복사 + `_registered.trees.has(...)` 와 `_registered.commands.has(...)` 를 해당 확장 id 로 맞춤.
3. **`package.json` scripts.test 추가/수정**: `"test": "node --test tests/*.test.mjs"` (기존 단위 테스트와 같이 돌게).
4. **`npm run build && npm test`** 로 확인. 활성화 도중 stub 이 던지면 stub 에 누락 메서드 추가.
5. **선택**: UI 검증이 핵심이면 Layer 2 추가. 그 외엔 Layer 1 만으로 충분.
6. **빌드 파이프라인 통합**: `vibecode-build-release-runner` 가 패키징 전에 `npm test` 를 항상 호출하도록 (이 스킬과 cross-reference).

## Reference

- 작동하는 예시: `vibecode-vscode-extension-host-mcp-list/tests/activation.test.mjs`
- esbuild + UMD fix 적용 예: `vibecode-vscode-extension-host-mcp-list/scripts/build-ext.mjs`
- 사례 기록: `docs/superpowers/specs/2026-05-25-vibecode-vscode-extension-host-mcp-list-design.md` (§14 Testing)

## Example invocation

vibecode-{{name}} 에 활성화 스모크 테스트 붙여줘.
