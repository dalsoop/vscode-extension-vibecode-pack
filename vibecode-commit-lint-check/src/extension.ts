import * as vscode from 'vscode';
import { apps } from './apps';
import { fullCommandId } from './apps/_types';
import { TemplateTreeProvider, VIEW_ID } from './treeProvider';

export function activate(context: vscode.ExtensionContext): void {
  for (const app of apps) {
    const id = fullCommandId(app.manifest.id);
    const disposable = vscode.commands.registerCommand(id, (arg, allUris) =>
      app.handler(arg as vscode.Uri | undefined, allUris as vscode.Uri[] | undefined)
    );
    context.subscriptions.push(disposable);
  }

  const provider = new TemplateTreeProvider();
  const treeView = vscode.window.createTreeView(VIEW_ID, {
    treeDataProvider: provider,
    showCollapseAll: true
  });
  context.subscriptions.push(treeView);

  context.subscriptions.push(
    vscode.commands.registerCommand('vibecodeCommitLint.refreshTree', () => provider.refresh())
  );

  // Re-scan user templates when the workspace or template files change.
  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders(() => provider.refresh())
  );
  const watcher = vscode.workspace.createFileSystemWatcher('**/commit-lint-templates/**/template.json');
  context.subscriptions.push(
    watcher,
    watcher.onDidCreate(() => provider.refresh()),
    watcher.onDidChange(() => provider.refresh()),
    watcher.onDidDelete(() => provider.refresh())
  );
}

export function deactivate(): void {
  // nothing to do — subscriptions are disposed by VSCode
}
