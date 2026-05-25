// Custom editor provider for `.env`-family files. Orchestration only — parsing lives in
// `env-parser.ts`, pattern classification in `file-patterns.ts`, example/schema lookup in
// `example-resolver.ts`, message handling in `handlers.ts`, l10n in `l10n-bundle.ts`,
// and all HTML/CSS/JS for the webview in `./webview/`.

import * as vscode from 'vscode';
import * as path from 'path';
import * as parser from './env-parser';
import { DefaultPatternRegistry } from './file-patterns';
import {
  SiblingExampleResolver,
  diffSchemas,
  type ExampleResolver
} from './example-resolver';
import { handle } from './handlers';
import { getL10nBundle } from './l10n-bundle';
import { buildHtml } from './webview/html';
import type {
  EntryView,
  ErrorMessage,
  ExampleInfo,
  InitMessage,
  UpdateMessage,
  WebviewToHost
} from './messages';

export const VIEW_TYPE = 'vibecodeEnvImport.editor';

export class EnvImportEditorProvider implements vscode.CustomTextEditorProvider {
  private readonly exampleResolver: ExampleResolver;

  constructor() {
    const registry = new DefaultPatternRegistry();
    this.exampleResolver = new SiblingExampleResolver(registry);
  }

  static register(_context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.window.registerCustomEditorProvider(
      VIEW_TYPE,
      new EnvImportEditorProvider(),
      {
        webviewOptions: { retainContextWhenHidden: true },
        supportsMultipleEditorsPerDocument: false
      }
    );
  }

  async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel
  ): Promise<void> {
    webviewPanel.webview.options = { enableScripts: true };
    webviewPanel.webview.html = buildHtml(webviewPanel.webview);

    const entriesFor = (doc: vscode.TextDocument): EntryView[] =>
      parser.keyList(parser.parse(doc.getText()));

    const exampleInfoFor = async (): Promise<ExampleInfo> => {
      const exampleUri = await this.exampleResolver.resolve(document.uri);
      if (!exampleUri) {
        return { examplePath: null, missingKeys: [], extraKeys: [] };
      }
      const diff = await diffSchemas(document.uri, exampleUri);
      return {
        examplePath: exampleUri.fsPath,
        missingKeys: diff.missingKeys,
        extraKeys: diff.extraKeys
      };
    };

    const postInit = async () => {
      const msg: InitMessage = {
        type: 'init',
        filename: path.basename(document.fileName),
        entries: entriesFor(document),
        l10n: getL10nBundle(),
        keyNamePattern: parser.KEY_NAME_RE.source,
        example: await exampleInfoFor()
      };
      webviewPanel.webview.postMessage(msg);
    };

    const postUpdate = async () => {
      const msg: UpdateMessage = {
        type: 'update',
        entries: entriesFor(document),
        example: await exampleInfoFor()
      };
      webviewPanel.webview.postMessage(msg);
    };

    const postError = (message: string) => {
      const msg: ErrorMessage = { type: 'error', message };
      webviewPanel.webview.postMessage(msg);
    };

    const changeSub = vscode.workspace.onDidChangeTextDocument(e => {
      if (e.document.uri.toString() === document.uri.toString()) postUpdate();
    });

    const msgSub = webviewPanel.webview.onDidReceiveMessage((msg: WebviewToHost) =>
      handle(msg, { document, exampleResolver: this.exampleResolver, postError })
    );

    webviewPanel.onDidDispose(() => {
      changeSub.dispose();
      msgSub.dispose();
    });

    await postInit();
  }
}
