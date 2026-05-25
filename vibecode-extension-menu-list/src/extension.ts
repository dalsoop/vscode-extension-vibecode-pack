import * as vscode from 'vscode';
import { apps } from './apps';
import { fullCommandId } from './apps/_types';
import { VibecodeSidebarProvider, SIDEBAR_VIEW_ID } from './sidebar-provider';
import { setSelfExtensionId } from './catalog';

export function activate(context: vscode.ExtensionContext): void {
  setSelfExtensionId(context.extension.id);

  const sidebarProvider = new VibecodeSidebarProvider(context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(SIDEBAR_VIEW_ID, sidebarProvider, {
      webviewOptions: { retainContextWhenHidden: true }
    })
  );

  for (const app of apps) {
    const id = fullCommandId(app.manifest.id);
    const disposable = vscode.commands.registerCommand(id, (arg, allUris) =>
      app.handler(arg as vscode.Uri | undefined, allUris as vscode.Uri[] | undefined)
    );
    context.subscriptions.push(disposable);
  }
}

export function deactivate(): void {
  // nothing to do — subscriptions are disposed by VSCode
}
