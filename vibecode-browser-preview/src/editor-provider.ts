import * as vscode from 'vscode';
import * as path from 'path';
import { PreviewServerRegistry } from './preview-server';
import { ReloadWatcher } from './reload-watcher';
import { buildHtml } from './webview/html';
import { getL10nBundle, type L10nBundle } from './l10n-bundle';

export const VIEW_TYPE = 'vibecodeBrowserPreview.editor';

export class BrowserPreviewEditorProvider implements vscode.CustomTextEditorProvider {
  private readonly registry = new PreviewServerRegistry();
  private readonly watcher = new ReloadWatcher();
  private readonly panelReloadCallbacks = new Set<() => void>();
  private readonly watcherSub: vscode.Disposable;

  constructor() {
    this.watcherSub = this.watcher.onReload(() => {
      for (const cb of this.panelReloadCallbacks) cb();
    });
  }

  static register(_context: vscode.ExtensionContext): vscode.Disposable {
    const provider = new BrowserPreviewEditorProvider();
    const registration = vscode.window.registerCustomEditorProvider(
      VIEW_TYPE,
      provider,
      {
        webviewOptions: { retainContextWhenHidden: true },
        supportsMultipleEditorsPerDocument: false
      }
    );
    return vscode.Disposable.from(
      registration,
      new vscode.Disposable(() => provider.dispose())
    );
  }

  dispose(): void {
    this.watcherSub.dispose();
    this.watcher.dispose();
  }

  async resolveCustomTextEditor(
    document: vscode.TextDocument,
    panel: vscode.WebviewPanel
  ): Promise<void> {
    const l10n = getL10nBundle();
    panel.webview.options = { enableScripts: true };
    panel.webview.html = buildHtml(panel.webview, l10n);

    const rootDir = this.pickRootDir(document.uri);

    if (!rootDir) {
      panel.webview.postMessage({
        type: 'noWorkspace',
        title: l10n.openFolderFirst,
        body: l10n.openFolderHint
      });
      return;
    }

    let serverUrl: URL | null = null;
    let release: (() => Promise<void>) | null = null;
    let panelReload: (() => void) | null = null;
    let disposed = false;

    const cleanup = async (): Promise<void> => {
      if (disposed) return;
      disposed = true;
      if (panelReload) this.panelReloadCallbacks.delete(panelReload);
      if (release) await release();
    };

    const relPath = (): string =>
      path.relative(rootDir, document.uri.fsPath).split(path.sep).join('/');

    const start = async (): Promise<void> => {
      try {
        const handle = await this.registry.acquire(rootDir);
        if (disposed) {
          await handle.release();
          return;
        }
        serverUrl = handle.url;
        release = handle.release;
        const fullUrl = serverUrl.toString() + relPath();
        panel.webview.postMessage({
          type: 'serverReady',
          url: fullUrl,
          relativePath: relPath()
        });
        panelReload = () => panel.webview.postMessage({ type: 'reload' });
        this.panelReloadCallbacks.add(panelReload);
      } catch (err) {
        panel.webview.postMessage({
          type: 'serverError',
          title: l10n.serverError.replace('{0}', (err as Error).message),
          body: '',
          retryLabel: l10n.retry
        });
      }
    };

    panel.webview.onDidReceiveMessage(async (msg: { type?: string }) => {
      if (!msg || typeof msg.type !== 'string') return;
      switch (msg.type) {
        case 'ready':
          await start();
          break;
        case 'manualReload':
          if (panelReload) panelReload();
          break;
        case 'editSource':
          await vscode.commands.executeCommand(
            'vscode.openWith',
            document.uri,
            'default',
            vscode.ViewColumn.Beside
          );
          break;
        case 'openExternal':
          if (serverUrl) {
            await vscode.env.openExternal(vscode.Uri.parse(serverUrl.toString() + relPath()));
          }
          break;
        case 'retry':
          await start();
          break;
      }
    });

    panel.onDidDispose(() => {
      void cleanup();
    });
  }

  private pickRootDir(uri: vscode.Uri): string | null {
    const folder = vscode.workspace.getWorkspaceFolder(uri);
    if (folder) return folder.uri.fsPath;
    if (uri.scheme === 'file') return path.dirname(uri.fsPath);
    return null;
  }
}

export type { L10nBundle };
