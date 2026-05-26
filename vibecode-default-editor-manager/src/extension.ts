import * as vscode from 'vscode';
import { DefaultEditorSidebarProvider, SIDEBAR_VIEW_ID } from './sidebar-provider';

export function activate(context: vscode.ExtensionContext): void {
  const provider = new DefaultEditorSidebarProvider(context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(SIDEBAR_VIEW_ID, provider, {
      webviewOptions: { retainContextWhenHidden: true },
    }),
  );
}

export function deactivate(): void {
}
