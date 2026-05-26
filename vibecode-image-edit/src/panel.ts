
import * as vscode from 'vscode';
import * as path from 'path';
import { handle } from './handlers';
import { getL10nBundle } from './l10n-bundle';
import { buildHtml } from './webview/html';
import type { InitMessage, WebviewToHost } from './messages';

const VIEW_TYPE = 'vibecodeImageEdit.panel';

export class ImageEditPanel {
  private static panels = new Map<string, ImageEditPanel>();

  private constructor(
    private readonly panel: vscode.WebviewPanel,
    private readonly source: vscode.Uri,
  ) {
    const folder = vscode.Uri.file(path.dirname(source.fsPath));
    panel.webview.options = {
      enableScripts: true,
      localResourceRoots: [folder],
    };
    panel.webview.html = buildHtml(panel.webview);

    panel.webview.onDidReceiveMessage((msg: WebviewToHost) =>
      handle(msg, { source }),
    );

    panel.onDidDispose(() => {
      ImageEditPanel.panels.delete(source.fsPath);
    });

    this.postInit();
  }

  static open(source: vscode.Uri): void {
    const key = source.fsPath;
    const existing = ImageEditPanel.panels.get(key);
    if (existing) {
      existing.panel.reveal(vscode.ViewColumn.Beside);
      return;
    }
    const panel = vscode.window.createWebviewPanel(
      VIEW_TYPE,
      path.basename(source.fsPath),
      vscode.ViewColumn.Beside,
      { retainContextWhenHidden: true, enableScripts: true },
    );
    ImageEditPanel.panels.set(key, new ImageEditPanel(panel, source));
  }

  private postInit(): void {
    const msg: InitMessage = {
      type: 'init',
      imageSrc: this.panel.webview.asWebviewUri(this.source).toString(),
      basename: path.basename(this.source.fsPath),
      l10n: getL10nBundle(),
    };
    this.panel.webview.postMessage(msg);
  }
}
