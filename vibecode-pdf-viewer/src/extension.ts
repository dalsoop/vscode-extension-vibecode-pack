import * as vscode from 'vscode';
import { PdfEditorProvider } from './editor-provider';

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(PdfEditorProvider.register(context));
}

export function deactivate(): void {}
