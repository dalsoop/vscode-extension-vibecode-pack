import * as vscode from 'vscode';
import { BrowserPreviewEditorProvider } from './editor-provider';

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(BrowserPreviewEditorProvider.register(context));
}

export function deactivate(): void {
  // nothing — subscriptions are disposed by VSCode
}
