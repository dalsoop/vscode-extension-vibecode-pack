import * as vscode from 'vscode';
import { loadChecks } from './checkLoader';
import type { CheckEntry, CheckState } from './types';
import { ChecksState } from './checksState';

export type ChecksNode =
  | { kind: 'check'; entry: CheckEntry }
  | { kind: 'empty'; label: string; commandId?: string }
  | { kind: 'invalid'; entry: CheckEntry };

const SHOW_OUTPUT_COMMAND_ID = 'vibecodeFileLint.showCheckOutput';
const SCAFFOLD_COMMAND_ID = 'vibecodeFileLint.scaffoldDefaultChecks';

export class ChecksTreeProvider implements vscode.TreeDataProvider<ChecksNode> {
  private readonly emitter = new vscode.EventEmitter<ChecksNode | undefined>();
  readonly onDidChangeTreeData = this.emitter.event;
  private entries: CheckEntry[] = [];

  constructor(private readonly state: ChecksState) {
    state.onDidChange(() => this.emitter.fire(undefined));
  }

  async refresh(): Promise<void> {
    const ws = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    this.entries = ws ? await loadChecks(ws) : [];
    this.emitter.fire(undefined);
  }

  getEntries(): CheckEntry[] {
    return this.entries;
  }

  async getChildren(node?: ChecksNode): Promise<ChecksNode[]> {
    if (node) return [];
    if (this.entries.length === 0) {
      return [
        {
          kind: 'empty',
          label: vscode.l10n.t('Click to scaffold default checks'),
          commandId: SCAFFOLD_COMMAND_ID
        }
      ];
    }
    return this.entries.map(entry =>
      entry.parsed.ok ? { kind: 'check', entry } : { kind: 'invalid', entry }
    );
  }

  getTreeItem(node: ChecksNode): vscode.TreeItem {
    if (node.kind === 'empty') {
      const item = new vscode.TreeItem(node.label, vscode.TreeItemCollapsibleState.None);
      item.iconPath = new vscode.ThemeIcon('lightbulb');
      if (node.commandId) {
        item.command = { command: node.commandId, title: node.label };
      }
      return item;
    }
    if (node.kind === 'invalid') {
      const errMsg = node.entry.parsed.ok ? '' : node.entry.parsed.error;
      const item = new vscode.TreeItem(node.entry.id, vscode.TreeItemCollapsibleState.None);
      item.description = vscode.l10n.t('parse error');
      item.tooltip = `${node.entry.dir}\n${errMsg}`;
      item.iconPath = new vscode.ThemeIcon(
        'warning',
        new vscode.ThemeColor('editorWarning.foreground')
      );
      item.contextValue = 'fileLintCheckInvalid';
      return item;
    }
    const entry = node.entry;
    if (!entry.parsed.ok) return new vscode.TreeItem(entry.id);
    const parsed = entry.parsed;
    const { state } = this.state.get(entry.id);
    const item = new vscode.TreeItem(parsed.resolvedLabel, vscode.TreeItemCollapsibleState.None);
    item.description = parsed.definition.description;
    item.iconPath = iconFor(state);
    item.tooltip = tooltipFor(parsed.resolvedLabel, parsed.definition.description, state);
    item.contextValue = 'fileLintCheck';
    item.command = {
      command: SHOW_OUTPUT_COMMAND_ID,
      title: vscode.l10n.t('Show Last Output'),
      arguments: [entry.id]
    };
    return item;
  }
}

function iconFor(state: CheckState): vscode.ThemeIcon {
  switch (state.kind) {
    case 'pass':
      return new vscode.ThemeIcon('pass', new vscode.ThemeColor('charts.green'));
    case 'fail':
      return new vscode.ThemeIcon('error', new vscode.ThemeColor('errorForeground'));
    case 'running':
      return new vscode.ThemeIcon('sync~spin');
    case 'idle':
    default:
      return new vscode.ThemeIcon('circle-large-outline');
  }
}

function tooltipFor(
  label: string,
  description: string | undefined,
  state: CheckState
): string {
  const head = description ? `${label}\n${description}` : label;
  switch (state.kind) {
    case 'pass':
      return `${head}\n\n✓ pass (exit ${state.exitCode}, ${state.durationMs}ms)`;
    case 'fail':
      return `${head}\n\n✗ fail: ${state.reason}`;
    case 'running':
      return `${head}\n\n⏳ running…`;
    case 'idle':
    default:
      return head;
  }
}
