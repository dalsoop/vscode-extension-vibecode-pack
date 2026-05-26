import * as vscode from 'vscode';
import { ImageEditorProvider } from './editor-provider';

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(ImageEditorProvider.register(context));
  context.subscriptions.push(
    vscode.commands.registerCommand('vibecodeImageViewer.openSettings', () =>
      vscode.commands.executeCommand(
        'workbench.action.openSettings',
        '@ext:dalsoop.vibecode-image-viewer'
      )
    )
  );
}

export function deactivate(): void {}
