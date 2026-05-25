import * as vscode from 'vscode';
import { apps } from './apps';
import { fullCommandId } from './apps/_types';

export function activate(context: vscode.ExtensionContext): void {
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
