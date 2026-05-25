import * as vscode from 'vscode';
import {
  CFG_TOP_N, CFG_WARN_THRESHOLD, EXTENSION_ID, VIEW_MODE_FLAT, VIEW_MODE_GROUP_EXT
} from '../constants';
import type {
  FileNode, GroupNode, ILineCache, IRegistry, ITreeViewMode, TreeNode
} from '../core/types';

type Node = TreeNode;

export class LineTreeProvider implements vscode.TreeDataProvider<Node> {
  private readonly _onDidChange = new vscode.EventEmitter<Node | undefined>();
  readonly onDidChangeTreeData = this._onDidChange.event;
  private current: ITreeViewMode;

  constructor(
    private readonly cache: ILineCache,
    private readonly registry: IRegistry,
    initialModeId: string
  ) {
    this.current = registry.getViewMode(initialModeId) ?? registry.listViewModes()[0];
    cache.onChange(() => this._onDidChange.fire(undefined));
  }

  setMode(id: string): void {
    const next = this.registry.getViewMode(id);
    if (next && next.id !== this.current.id) {
      this.current = next;
      this._onDidChange.fire(undefined);
    }
  }

  currentModeId(): string { return this.current.id; }

  toggleMode(): string {
    const next = this.current.id === VIEW_MODE_FLAT ? VIEW_MODE_GROUP_EXT : VIEW_MODE_FLAT;
    this.setMode(next);
    return this.current.id;
  }

  refresh(): void { this._onDidChange.fire(undefined); }

  getTreeItem(node: Node): vscode.TreeItem {
    if (node.kind === 'group') return this.groupItem(node);
    return this.fileItem(node);
  }

  getChildren(node?: Node): Node[] {
    if (!node) {
      const cfg = vscode.workspace.getConfiguration(EXTENSION_ID);
      const ctx = {
        topN: cfg.get<number>(CFG_TOP_N, 100),
        warnThreshold: cfg.get<number>(CFG_WARN_THRESHOLD, 500)
      };
      return this.current.build(this.cache.all(), ctx);
    }
    if (node.kind === 'group') return node.children;
    return [];
  }

  private fileItem(n: FileNode): vscode.TreeItem {
    const uri = vscode.Uri.file(n.stat.uri.fsPath);
    const rel = vscode.workspace.asRelativePath(uri, false);
    const item = new vscode.TreeItem(`${n.stat.lines}  ${rel}`, vscode.TreeItemCollapsibleState.None);
    item.resourceUri = uri;
    item.tooltip = `${n.stat.lines} lines\n${rel}`;
    item.command = { command: 'vscode.open', title: 'Open', arguments: [uri] };
    if (n.warn) {
      item.iconPath = new vscode.ThemeIcon('warning', new vscode.ThemeColor('list.warningForeground'));
    } else {
      item.iconPath = new vscode.ThemeIcon('file');
    }
    return item;
  }

  private groupItem(n: GroupNode): vscode.TreeItem {
    const item = new vscode.TreeItem(
      `${n.label}  (${n.fileCount} files, ${n.totalLines} lines)`,
      vscode.TreeItemCollapsibleState.Collapsed
    );
    item.iconPath = new vscode.ThemeIcon('folder');
    return item;
  }
}
