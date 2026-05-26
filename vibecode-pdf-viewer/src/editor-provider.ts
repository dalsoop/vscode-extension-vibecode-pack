import * as vscode from 'vscode';
import * as path from 'path';
import { buildHtml } from './html';
import { getL10nBundle } from './l10n-bundle';

export const VIEW_TYPE = 'vibecodePdfViewer.editor';

interface PdfDocument extends vscode.CustomDocument {
  readonly uri: vscode.Uri;
}

export class PdfEditorProvider implements vscode.CustomReadonlyEditorProvider<PdfDocument> {
  constructor(private readonly extensionUri: vscode.Uri) {}

  static register(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.window.registerCustomEditorProvider(
      VIEW_TYPE,
      new PdfEditorProvider(context.extensionUri),
      {
        webviewOptions: { retainContextWhenHidden: true },
        supportsMultipleEditorsPerDocument: false,
      },
    );
  }

  openCustomDocument(uri: vscode.Uri): PdfDocument {
    return { uri, dispose: () => {} };
  }

  async resolveCustomEditor(
    document: PdfDocument,
    panel: vscode.WebviewPanel,
  ): Promise<void> {
    const folderUri = vscode.Uri.file(path.dirname(document.uri.fsPath));
    const distUri = vscode.Uri.joinPath(this.extensionUri, 'dist');

    panel.webview.options = {
      enableScripts: true,
      localResourceRoots: [folderUri, distUri],
    };
    panel.webview.html = buildHtml(panel.webview, distUri);

    panel.webview.onDidReceiveMessage(async (msg) => {
      if (msg?.type === 'copyText' && typeof msg.text === 'string') {
        await vscode.env.clipboard.writeText(msg.text);
        vscode.window.setStatusBarMessage(vscode.l10n.t('Page text copied.'), 1500);
      }
    });

    panel.webview.postMessage({
      type: 'init',
      pdfSrc: panel.webview.asWebviewUri(document.uri).toString(),
      workerSrc: panel.webview
        .asWebviewUri(vscode.Uri.joinPath(distUri, 'pdf.worker.mjs'))
        .toString(),
      basename: path.basename(document.uri.fsPath),
      l10n: getL10nBundle(),
    });
  }
}
