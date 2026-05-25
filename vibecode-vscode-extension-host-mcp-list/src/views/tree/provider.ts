import * as vscode from 'vscode';
import { McpState } from '../../state';
import { MCP_SOURCE, SourceId } from '../../sources/_types';
import { SourceGroupItem, McpServerItem } from './items';

export class McpTreeProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private readonly _onDidChange = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onDidChange.event;

  constructor(private state: McpState) {
    state.onDidChange(() => this._onDidChange.fire());
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
    if (!element) return this.rootGroups();
    if (element instanceof SourceGroupItem) return this.groupChildren(element);
    return [];
  }

  private rootGroups(): SourceGroupItem[] {
    const out: SourceGroupItem[] = [];
    const user = this.state.getBySource(MCP_SOURCE.USER_MCP_JSON);
    if (user.length > 0) {
      out.push(new SourceGroupItem(vscode.l10n.t('User'), MCP_SOURCE.USER_MCP_JSON));
    }
    const ws = this.state.getBySource(MCP_SOURCE.WORKSPACE_MCP_JSON);
    const folders = [...new Set(ws.map(e => e.workspaceFolder).filter((f): f is string => !!f))].sort();
    for (const folder of folders) {
      out.push(new SourceGroupItem(`${vscode.l10n.t('Workspace')} · ${folder}`, `${MCP_SOURCE.WORKSPACE_MCP_JSON}:${folder}`));
    }
    const ext = this.state.getBySource(MCP_SOURCE.EXTENSION_CONTRIBUTES);
    if (ext.length > 0) {
      out.push(new SourceGroupItem(vscode.l10n.t('Extension'), MCP_SOURCE.EXTENSION_CONTRIBUTES));
    }
    return out;
  }

  private groupChildren(group: SourceGroupItem): McpServerItem[] {
    const [rawSourceId, folder] = group.key.split(':');
    const sourceId = rawSourceId as SourceId;
    const entries = this.state.getBySource(sourceId);
    const filtered = folder
      ? entries.filter(e => e.workspaceFolder === folder)
      : entries;
    return filtered.map(e => new McpServerItem(e));
  }
}
