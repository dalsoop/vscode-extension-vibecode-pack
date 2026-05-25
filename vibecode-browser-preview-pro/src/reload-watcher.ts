import * as vscode from 'vscode';

const IGNORE_RE = /[/\\](node_modules|\.git|dist|out)[/\\]/;
const DEBOUNCE_MS = 200;

export class ReloadWatcher {
  private readonly watcher: vscode.FileSystemWatcher;
  private readonly listeners = new Set<() => void>();
  private timer: NodeJS.Timeout | null = null;
  private readonly disposables: vscode.Disposable[] = [];

  constructor() {
    this.watcher = vscode.workspace.createFileSystemWatcher('**/*');
    const onAny = (uri: vscode.Uri) => this.onChange(uri);
    this.disposables.push(
      this.watcher,
      this.watcher.onDidChange(onAny),
      this.watcher.onDidCreate(onAny),
      this.watcher.onDidDelete(onAny)
    );
  }

  onReload(listener: () => void): vscode.Disposable {
    this.listeners.add(listener);
    return new vscode.Disposable(() => this.listeners.delete(listener));
  }

  dispose(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    for (const d of this.disposables) d.dispose();
    this.listeners.clear();
  }

  private onChange(uri: vscode.Uri): void {
    if (IGNORE_RE.test(uri.fsPath)) return;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      for (const listener of this.listeners) {
        try {
          listener();
        } catch {
          // swallow — one bad listener shouldn't block the others
        }
      }
    }, DEBOUNCE_MS);
  }
}
