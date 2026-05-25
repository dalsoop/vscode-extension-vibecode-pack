import * as vscode from 'vscode';
import {
  readBundledTemplates,
  readUserTemplates,
  type TemplateEntry,
  type TemplateSource
} from './lib/templateUtils';

export const VIEW_ID = 'vibecodeCommitLint.templates';
const APPLY_COMMAND_ID = 'vibecodeCommitLint.applyTemplate';

interface GroupNode {
  kind: 'group';
  source: TemplateSource;
  label: string;
  children: TemplateNode[];
}

interface TemplateNode {
  kind: 'template';
  entry: TemplateEntry;
}

interface EmptyNode {
  kind: 'empty';
  message: string;
}

type Node = GroupNode | TemplateNode | EmptyNode;

export class TemplateTreeProvider implements vscode.TreeDataProvider<Node> {
  private readonly _onDidChange = new vscode.EventEmitter<Node | undefined>();
  readonly onDidChangeTreeData = this._onDidChange.event;

  refresh(): void {
    this._onDidChange.fire(undefined);
  }

  async getChildren(node?: Node): Promise<Node[]> {
    if (!node) {
      return this.rootGroups();
    }
    if (node.kind === 'group') {
      return node.children.length > 0
        ? node.children
        : [{ kind: 'empty', message: this.emptyMessage(node.source) }];
    }
    return [];
  }

  getTreeItem(node: Node): vscode.TreeItem {
    if (node.kind === 'group') {
      const item = new vscode.TreeItem(node.label, vscode.TreeItemCollapsibleState.Expanded);
      item.iconPath = new vscode.ThemeIcon(node.source === 'bundled' ? 'package' : 'person');
      item.contextValue = `commitLintGroup-${node.source}`;
      return item;
    }
    if (node.kind === 'template') {
      const targetFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      const item = new vscode.TreeItem(node.entry.name, vscode.TreeItemCollapsibleState.None);
      item.description = node.entry.template.description;
      item.tooltip = `${node.entry.name}\n${node.entry.template.description}\n\n${vscode.l10n.t('Click to scaffold into workspace root.')}`;
      item.iconPath = new vscode.ThemeIcon('file-code');
      item.contextValue = `commitLintTemplate-${node.entry.source}`;
      if (targetFolder) {
        item.command = {
          command: APPLY_COMMAND_ID,
          title: vscode.l10n.t('Apply Template'),
          arguments: [{ templateDir: node.entry.dir, targetFolder }]
        };
      }
      return item;
    }
    const item = new vscode.TreeItem(node.message, vscode.TreeItemCollapsibleState.None);
    item.iconPath = new vscode.ThemeIcon('info');
    return item;
  }

  private async rootGroups(): Promise<Node[]> {
    const bundled = await readBundledTemplates();
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    const user = workspaceFolder ? await readUserTemplates(workspaceFolder) : [];
    return [
      {
        kind: 'group',
        source: 'bundled',
        label: vscode.l10n.t('Bundled Templates ({0})', String(bundled.length)),
        children: bundled.map(entry => ({ kind: 'template', entry }))
      },
      {
        kind: 'group',
        source: 'user',
        label: vscode.l10n.t('User Templates ({0})', String(user.length)),
        children: user.map(entry => ({ kind: 'template', entry }))
      }
    ];
  }

  private emptyMessage(source: TemplateSource): string {
    return source === 'bundled'
      ? vscode.l10n.t('No bundled templates found.')
      : vscode.l10n.t('No user templates yet — use Add Template to create one.');
  }
}
