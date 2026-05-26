import { test } from 'node:test';
import assert from 'node:assert/strict';
import Module from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXTENSION_JS = join(__dirname, '..', 'dist', 'extension.js');

const EXPECTED_VIEWS = [
  'vibecodeFileLint.checks',
];
const EXPECTED_COMMANDS = [
  'vibecodeFileLint.openSettings',
  'vibecodeFileLint.revealChecksFolder',
  'vibecodeFileLint.refreshChecks',
  'vibecodeFileLint.showCheckOutput',
  'vibecodeFileLint.runAllChecks',
  'vibecodeFileLint.runCheck',
  'vibecodeFileLint.scaffoldDefaultChecks',
];

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
  const watcher = {
    onDidChange: () => new Disposable(),
    onDidCreate: () => new Disposable(),
    onDidDelete: () => new Disposable(),
    dispose: () => {}
  };

  return {
    Disposable, EventEmitter, TreeItem,
    TreeItemCollapsibleState: { None: 0, Collapsed: 1, Expanded: 2 },
    ThemeIcon, MarkdownString, RelativePattern, Uri,
    ViewColumn: { Beside: -2, One: 1 },
    window: {
      createTreeView: (id, opts) => { registered.trees.set(id, opts.treeDataProvider); return new Disposable(); },
      createWebviewPanel: () => { throw new Error('not used in activation test'); },
      createOutputChannel: () => ({ append: () => {}, appendLine: () => {}, show: () => {}, dispose: () => {} }),
      showWarningMessage: () => {}, showErrorMessage: () => {}, showInformationMessage: () => {},
      setStatusBarMessage: () => {}, showQuickPick: async () => undefined,
      activeTextEditor: undefined,
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
      getConfiguration: () => ({ get: () => undefined, has: () => false, inspect: () => undefined, update: async () => {} }),
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

    for (const viewId of EXPECTED_VIEWS) {
      assert.ok(stub._registered.trees.has(viewId), `view ${viewId} must have a TreeDataProvider`);
      const provider = stub._registered.trees.get(viewId);
      assert.equal(typeof provider.getChildren, 'function', `${viewId} provider needs getChildren`);
      assert.equal(typeof provider.getTreeItem, 'function', `${viewId} provider needs getTreeItem`);
    }
    for (const cmd of EXPECTED_COMMANDS) {
      assert.ok(stub._registered.commands.has(cmd), `command ${cmd} must be registered`);
    }
  } finally {
    Module._resolveFilename = originalResolve;
    Module._load = originalLoad;
  }
});
