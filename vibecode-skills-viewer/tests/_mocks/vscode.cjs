// Minimal vscode stub for unit tests. Add more shapes as tests need them.
class EventEmitter {
  constructor() {
    this.listeners = [];
    this.event = cb => {
      this.listeners.push(cb);
      return { dispose: () => {} };
    };
  }
  fire(x) { for (const l of this.listeners) l(x); }
  dispose() {}
}

module.exports = {
  workspace: {
    workspaceFolders: null,
    getConfiguration: () => ({ get: (_k, d) => d }),
    onDidChangeConfiguration: () => ({ dispose() {} })
  },
  window: {
    createOutputChannel: () => null,
    activeTextEditor: null,
    onDidChangeActiveTextEditor: () => ({ dispose() {} }),
    createStatusBarItem: () => ({ show() {}, dispose() {}, text: '', tooltip: '', command: '' }),
    showInformationMessage: () => {},
    showWarningMessage: () => {},
    showErrorMessage: () => {}
  },
  extensions: { all: [] },
  EventEmitter,
  Uri: { file: p => ({ fsPath: p, toString: () => p }), parse: s => ({ toString: () => s }) },
  ThemeIcon: class { constructor(id) { this.id = id; } },
  StatusBarAlignment: { Right: 2, Left: 1 }
};
