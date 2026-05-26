import * as vscode from 'vscode';
import { apps } from './apps';
import { fullCommandId, VIEW_ID, COMMAND_PREFIX } from './apps/_types';
import { MarkdownTreeProvider } from './tree-provider';
import { setState } from './state';
import { CONFIG_SECTION, debounce } from './utils';

const WATCH_GLOB = '**/*.{md,mdx,markdown}';
const REFRESH_DELAY_MS = 250;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const provider = new MarkdownTreeProvider();
  const treeView = vscode.window.createTreeView(VIEW_ID, {
    treeDataProvider: provider,
    showCollapseAll: true
  });
  setState({ provider, treeView });

  for (const app of apps) {
    const id = fullCommandId(app.manifest.id);
    const disposable = vscode.commands.registerCommand(id, (arg, allUris) =>
      app.handler(arg as vscode.Uri | undefined, allUris as vscode.Uri[] | undefined)
    );
    context.subscriptions.push(disposable);
  }

  const refreshSoon = debounce(() => {
    void provider.refresh();
  }, REFRESH_DELAY_MS);
  const watcher = vscode.workspace.createFileSystemWatcher(WATCH_GLOB);

  context.subscriptions.push(
    treeView,
    watcher,
    watcher.onDidCreate(refreshSoon),
    watcher.onDidChange(refreshSoon),
    watcher.onDidDelete(refreshSoon),
    vscode.workspace.onDidChangeConfiguration(event => {
      if (event.affectsConfiguration(CONFIG_SECTION)) void provider.refresh();
    }),
    vscode.workspace.onDidChangeWorkspaceFolders(() => void provider.refresh())
  );

  await provider.refresh();

  void COMMAND_PREFIX;
}

export function deactivate(): void {}
