import * as vscode from 'vscode';
import { collectAllSkills } from './sources';

let item: vscode.StatusBarItem | null = null;

export function refresh(): void {
  if (!item) return;
  const all = collectAllSkills({});
  const ws = all.filter(x => x.source.scope === 'workspace').length;
  const total = all.length;
  item.text = `$(book) ${total}${ws ? ` · ws ${ws}` : ''}`;
  item.tooltip = `Claude & Codex Skills: ${total} installed${ws ? ` (${ws} in workspace)` : ''} — click to filter`;
  item.command = 'claudeCodexSkills.search';
}

export function activate(context: vscode.ExtensionContext): void {
  item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 80);
  context.subscriptions.push(item);
  refresh();
  item.show();
}
