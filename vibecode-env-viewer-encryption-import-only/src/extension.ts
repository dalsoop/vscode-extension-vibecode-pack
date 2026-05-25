import * as vscode from 'vscode';
import { EnvImportEditorProvider } from './editor-provider';
import { HUB_VIEW_ID, HubProvider } from './webview/hub';
import * as statusBar from './statusBar';
import { registerEnableEncryption } from './commands/enable-encryption';
import { registerSelectStrategy } from './commands/select-strategy';
import { registerRefreshHub } from './commands/refresh-hub';
import { registerOpenEncrypted } from './commands/open-encrypted';

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(EnvImportEditorProvider.register(context));

  const hub = new HubProvider(context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(HUB_VIEW_ID, hub, {
      webviewOptions: { retainContextWhenHidden: true }
    })
  );

  context.subscriptions.push(
    registerEnableEncryption(context),
    registerSelectStrategy(context),
    registerRefreshHub(context, hub),
    registerOpenEncrypted(context)
  );

  statusBar.activate(context);
}

export function deactivate(): void {
  // nothing to do — subscriptions are disposed by VSCode
}
