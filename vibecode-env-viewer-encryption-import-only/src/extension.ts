import * as vscode from 'vscode';
import { EnvImportEditorProvider } from './editor-provider';
import { registerEnableEncryption } from './commands/enable-encryption';

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(EnvImportEditorProvider.register(context));
  context.subscriptions.push(registerEnableEncryption(context));
}

export function deactivate(): void {
  // nothing to do — subscriptions are disposed by VSCode
}
