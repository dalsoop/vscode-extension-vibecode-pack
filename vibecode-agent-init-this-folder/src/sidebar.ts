// Sidebar = catalog of project starter kits (bundled under `<extension>/starters/`).
// Each top-level folder inside `starters/` is one installable kit; clicking it triggers
// recursive copy into a user-picked target folder via `vibecodeAgentInit.applyTemplate`.

import * as vscode from 'vscode';
import * as fs from 'fs';

const VIEW_ID = 'vibecodeAgentInit.templates';
const STARTERS_SUBDIR = 'starters';

export interface StarterRef {
  /** Absolute path of the starter folder under <extension>/starters/<name>/. */
  rootUri: vscode.Uri;
  /** Folder name (the kit's id). */
  name: string;
}

interface EntryNode {
  kind: 'entry';
  starter: StarterRef;
}

type TreeNode = EntryNode;

export class StartersProvider implements vscode.TreeDataProvider<TreeNode> {
  private readonly _onDidChange = new vscode.EventEmitter<TreeNode | undefined>();
  readonly onDidChangeTreeData = this._onDidChange.event;

  constructor(private readonly extensionUri: vscode.Uri) {}

  refresh(): void {
    this._onDidChange.fire(undefined);
  }

  getTreeItem(node: TreeNode): vscode.TreeItem {
    const item = new vscode.TreeItem(node.starter.name, vscode.TreeItemCollapsibleState.None);
    item.iconPath = new vscode.ThemeIcon('rocket');
    item.contextValue = 'starterItem';
    item.tooltip = `${node.starter.rootUri.fsPath}\n\nClick to install into a folder.`;
    item.command = {
      command: 'vibecodeAgentInit.applyTemplate',
      title: 'Install starter…',
      arguments: [node.starter.rootUri]
    };
    return item;
  }

  async getChildren(): Promise<TreeNode[]> {
    const starters = await this.listStarters();
    return starters.map(starter => ({ kind: 'entry', starter }));
  }

  private async listStarters(): Promise<StarterRef[]> {
    const dir = vscode.Uri.joinPath(this.extensionUri, STARTERS_SUBDIR);
    try {
      const entries = await fs.promises.readdir(dir.fsPath, { withFileTypes: true });
      return entries
        .filter(e => e.isDirectory())
        .map(e => ({
          rootUri: vscode.Uri.joinPath(dir, e.name),
          name: e.name
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
    } catch {
      return [];
    }
  }
}

export function registerSidebar(context: vscode.ExtensionContext): StartersProvider {
  const provider = new StartersProvider(context.extensionUri);
  const view = vscode.window.createTreeView(VIEW_ID, { treeDataProvider: provider });
  context.subscriptions.push(view);
  return provider;
}
