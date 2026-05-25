import * as vscode from 'vscode';
import { apps } from './apps';
import { fullCommandId } from './apps/_types';
import { registerSidebar } from './sidebar';

export function activate(context: vscode.ExtensionContext): void {
  // Temporary activation log — helps verify the extension loaded after install/reload.
  // Remove or guard behind a setting once the sidebar UX is confirmed stable.
  const out = vscode.window.createOutputChannel('Vibecode Agent Init');
  out.appendLine(`[${new Date().toISOString()}] activated`);
  context.subscriptions.push(out);

  const sidebar = registerSidebar(context);

  for (const app of apps) {
    const id = fullCommandId(app.manifest.id);
    if (app.manifest.id === 'refreshTemplates') {
      // refreshTemplates is a sidebar-owned command — delegate to provider.
      context.subscriptions.push(
        vscode.commands.registerCommand(id, () => sidebar.refresh())
      );
      continue;
    }
    context.subscriptions.push(
      vscode.commands.registerCommand(id, (arg, allUris) =>
        app.handler(arg as vscode.Uri | undefined, allUris as vscode.Uri[] | undefined)
      )
    );
  }
}

export function deactivate(): void {
  // nothing to do — subscriptions are disposed by VSCode
}
