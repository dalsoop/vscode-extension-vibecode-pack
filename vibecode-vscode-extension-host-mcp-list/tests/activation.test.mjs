// Headless activation smoke-test:
// load dist/extension.js with a stubbed `vscode` module and verify activate()
// completes without throwing, and that a TreeDataProvider was registered for
// the declared view id. This is the test that would have caught the missing
// jsonc-parser dependency bug.

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
  TreeItem.None = 0; TreeItem.Collapsed = 1; TreeItem.Expanded = 2;

  class ThemeIcon { constructor(id) { this.id = id; } }
  class MarkdownString { constructor(v) { this.value = v ?? ''; } appendMarkdown(v) { this.value += v; return this; } }
  class RelativePattern { constructor(base, pattern) { this.base = base; this.pattern = pattern; } }
  class Uri {
    static file(p) { return { fsPath: p, scheme: 'file', toString: () => `file://${p}` }; }
    static joinPath(base, ...parts) { return { fsPath: [base.fsPath, ...parts].join('/'), scheme: 'file' }; }
  }
  const ViewColumn = { Beside: -2, One: 1 };

  const watcher = {
    onDidChange: () => new Disposable(),
    onDidCreate: () => new Disposable(),
    onDidDelete: () => new Disposable(),
    dispose: () => {}
  };

  return {
    Disposable, EventEmitter, TreeItem,
    TreeItemCollapsibleState: { None: 0, Collapsed: 1, Expanded: 2 },
    ThemeIcon, MarkdownString, RelativePattern, Uri, ViewColumn,
    window: {
      createTreeView(id, opts) {
        registered.trees.set(id, opts.treeDataProvider);
        return new Disposable();
      },
      createWebviewPanel() { throw new Error('not used in activation test'); },
      showWarningMessage() {},
      showErrorMessage() {},
      showInformationMessage() {},
      setStatusBarMessage() {},
      showQuickPick: async () => undefined,
    },
    commands: {
      registerCommand(id, handler) {
        registered.commands.set(id, handler);
        return new Disposable();
      },
      executeCommand: async () => {},
    },
    workspace: {
      workspaceFolders: undefined,
      createFileSystemWatcher(_pattern) { registered.watchers.push(_pattern); return watcher; },
      onDidChangeWorkspaceFolders() { return new Disposable(); },
      openTextDocument: async (p) => ({ uri: Uri.file(p) }),
    },
    extensions: {
      all: [],
      onDidChange() { return new Disposable(); },
    },
    env: {
      clipboard: { writeText: async () => {} },
    },
    l10n: {
      t(s, ...args) { return args.length ? String(s).replace(/\{(\d+)\}/g, (_, i) => String(args[i])) : String(s); },
    },
    _registered: registered,
  };
}

test('extension activates without throwing + registers tree provider', async () => {
  const stub = makeStubVscode();
  // Inject stub into Module resolver
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

    const fakeContext = {
      subscriptions: [],
      extensionUri: stub.Uri.file('/tmp/fake-ext-root'),
    };
    await ext.activate(fakeContext);

    assert.ok(stub._registered.trees.has('vibecodeMcpList.tree'), 'tree provider for vibecodeMcpList.tree must be registered');
    const provider = stub._registered.trees.get('vibecodeMcpList.tree');
    assert.equal(typeof provider.getChildren, 'function', 'provider should have getChildren');
    assert.equal(typeof provider.getTreeItem, 'function', 'provider should have getTreeItem');

    // Verify all 5 commands registered
    const expectedCmds = [
      'vibecodeMcpList.refresh',
      'vibecodeMcpList.openUserMcpJson',
      'vibecodeMcpList.openWorkspaceMcpJson',
      'vibecodeMcpList.openDetail',
      'vibecodeMcpList.copyCommand',
    ];
    for (const cmd of expectedCmds) {
      assert.ok(stub._registered.commands.has(cmd), `command ${cmd} must be registered`);
    }
  } finally {
    Module._resolveFilename = originalResolve;
    Module._load = originalLoad;
  }
});
