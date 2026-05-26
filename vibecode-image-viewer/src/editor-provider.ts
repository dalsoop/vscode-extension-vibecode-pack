
import * as vscode from 'vscode';
import * as path from 'path';
import { handle } from './handlers';
import { isUnsupportedForPreview, readImageMeta } from './image-meta';
import { getL10nBundle } from './l10n-bundle';
import { buildHtml } from './webview/html';
import type { InitMessage, WebviewToHost } from './messages';

export const VIEW_TYPE = 'vibecodeImageViewer.editor';

interface ImageDocument extends vscode.CustomDocument {
  readonly uri: vscode.Uri;
}

export class ImageEditorProvider implements vscode.CustomReadonlyEditorProvider<ImageDocument> {
  static register(_context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.window.registerCustomEditorProvider(
      VIEW_TYPE,
      new ImageEditorProvider(),
      {
        webviewOptions: { retainContextWhenHidden: true },
        supportsMultipleEditorsPerDocument: false,
      },
    );
  }

  openCustomDocument(uri: vscode.Uri): ImageDocument {
    return { uri, dispose: () => {} };
  }

  async resolveCustomEditor(
    document: ImageDocument,
    webviewPanel: vscode.WebviewPanel,
  ): Promise<void> {
    const folderUri = vscode.Uri.file(path.dirname(document.uri.fsPath));
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [folderUri],
    };
    webviewPanel.webview.html = buildHtml(webviewPanel.webview);

    const msgSub = webviewPanel.webview.onDidReceiveMessage((msg: WebviewToHost) =>
      handle(msg, { uri: document.uri }),
    );
    webviewPanel.onDidDispose(() => msgSub.dispose());

    await this.postInit(document.uri, webviewPanel);
  }

  private async postInit(uri: vscode.Uri, panel: vscode.WebviewPanel): Promise<void> {
    const unsupported = isUnsupportedForPreview(uri.fsPath);
    const imageSrc = unsupported ? null : panel.webview.asWebviewUri(uri).toString();

    let metaPayload: Awaited<ReturnType<typeof readImageMeta>>;
    try {
      metaPayload = await readImageMeta(uri.fsPath);
    } catch (err) {
      const init: InitMessage = {
        type: 'init',
        file: {
          path: uri.fsPath,
          basename: path.basename(uri.fsPath),
          sizeBytes: 0,
          mtimeMs: Date.now(),
          format: path.extname(uri.fsPath).toUpperCase().replace(/^\./, ''),
          width: null,
          height: null,
        },
        imageSrc,
        unsupportedPreview: unsupported,
        camera: emptyCamera(),
        gps: null,
        rawExif: {},
        hasExif: false,
        metadataError: String((err as Error)?.message ?? err),
        l10n: getL10nBundle(),
      };
      panel.webview.postMessage(init);
      return;
    }

    const init: InitMessage = {
      type: 'init',
      file: metaPayload.file,
      imageSrc,
      unsupportedPreview: unsupported,
      camera: metaPayload.camera,
      gps: metaPayload.gps,
      rawExif: stripUnserializable(metaPayload.rawExif),
      hasExif: metaPayload.hasExif,
      metadataError: metaPayload.error,
      l10n: getL10nBundle(),
    };
    panel.webview.postMessage(init);
  }
}

function emptyCamera() {
  return {
    make: null,
    model: null,
    lens: null,
    exposureTime: null,
    fNumber: null,
    iso: null,
    focalLength: null,
    dateTaken: null,
    software: null,
    orientation: null,
    colorSpace: null,
    bitDepth: null,
  };
}

function stripUnserializable(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v instanceof Uint8Array) {
      out[k] = `<binary ${v.byteLength} bytes>`;
    } else if (v instanceof Date) {
      out[k] = v.toISOString();
    } else if (v && typeof v === 'object' && !Array.isArray(v)) {
      try {
        JSON.stringify(v);
        out[k] = v;
      } catch {
        out[k] = String(v);
      }
    } else {
      out[k] = v;
    }
  }
  return out;
}
