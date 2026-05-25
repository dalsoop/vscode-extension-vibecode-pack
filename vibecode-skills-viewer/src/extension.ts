import * as vscode from 'vscode';
import * as state from './state';
import * as commands from './commands';
import * as lmTools from './lmTools';
import * as chat from './chat';
import * as statusBar from './statusBar';
import * as i18n from './i18n';
import { HubProvider } from './webview/hub';
import { bus } from './bus';
import { setExtensionPath } from './webview/preview';

export function activate(context: vscode.ExtensionContext): void {
  i18n.activate(context);
  state.init(context);
  setExtensionPath(context.extensionPath);

  const hub = new HubProvider(context);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('vibeskills.hub', hub, {
      webviewOptions: { retainContextWhenHidden: true }
    })
  );

  commands.setContext(context);
  commands.register(context, { hub });
  lmTools.registerAll(context);
  chat.register(context);
  statusBar.activate(context);

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('vibecodeSkills')) bus.emit('config-changed');
    }),
    bus.on(() => statusBar.refresh())
  );
}

export function deactivate(): void {}
