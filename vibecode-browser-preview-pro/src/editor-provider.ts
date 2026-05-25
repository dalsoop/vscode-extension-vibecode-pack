import * as vscode from 'vscode';
import * as path from 'path';
import { PreviewServerRegistry } from './preview-server';
import { ReloadWatcher } from './reload-watcher';
import { buildHtml } from './webview/html';
import { getL10nBundle, type L10nBundle } from './l10n-bundle';
import { SnapshotWriter } from './snapshot-writer';
import type { SnapshotPayload } from './snapshot-types';

export const VIEW_TYPE = 'vibecodeBrowserPreviewPro.editor';

export class BrowserPreviewEditorProvider implements vscode.CustomTextEditorProvider {
  private readonly registry = new PreviewServerRegistry();
  private readonly watcher = new ReloadWatcher();
  private readonly snapshotWriter = new SnapshotWriter();
  private readonly panelReloadCallbacks = new Set<() => void>();
  private readonly watcherSub: vscode.Disposable;
  private readonly extensionUri: vscode.Uri;

  constructor(extensionUri: vscode.Uri) {
    this.extensionUri = extensionUri;
    this.watcherSub = this.watcher.onReload(() => {
      for (const cb of this.panelReloadCallbacks) cb();
    });
  }

  static register(context: vscode.ExtensionContext): vscode.Disposable {
    const provider = new BrowserPreviewEditorProvider(context.extensionUri);
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
    panel.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, 'dist')]
    };
    const codiconCssUri = panel.webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'dist', 'codicons', 'codicon.css')
    );
    panel.webview.html = buildHtml(panel.webview, l10n, codiconCssUri);

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

    const saveSnapshot = async (payload: SnapshotPayload): Promise<void> => {
      try {
        const result = await this.snapshotWriter.write(rootDir, document.uri.fsPath, payload);
        panel.webview.postMessage({
          type: 'snapshotSaved',
          text: l10n.snapshotSaved.replace('{0}', result.folderRelPath),
          path: result.folderAbsPath,
          actionLabel: l10n.openSnapshotFolder
        });
      } catch (err) {
        panel.webview.postMessage({
          type: 'snapshotError',
          text: l10n.snapshotFailed.replace('{0}', (err as Error).message)
        });
      }
    };

    panel.webview.onDidReceiveMessage(async (msg: { type?: string; [k: string]: any }) => {
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
        case 'toggleInspector':
          // Currently no host-side state; accepted for future-proofing.
          break;
        case 'snapshotData':
          if (msg.payload) await saveSnapshot(msg.payload as SnapshotPayload);
          break;
        case 'openSnapshotFolder':
          if (typeof msg.path === 'string') {
            await this.snapshotWriter.revealInFinder(msg.path);
          }
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
