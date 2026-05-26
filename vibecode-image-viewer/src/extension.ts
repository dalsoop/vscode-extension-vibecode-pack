import * as vscode from 'vscode';
import { ImageEditorProvider } from './editor-provider';

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(ImageEditorProvider.register(context));
}

export function deactivate(): void {
}
