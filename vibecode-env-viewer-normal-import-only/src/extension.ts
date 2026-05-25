import * as vscode from 'vscode';
import { EnvImportEditorProvider } from './editor-provider';

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(EnvImportEditorProvider.register(context));
}

export function deactivate(): void {
  // nothing to do — subscriptions are disposed by VSCode
}
