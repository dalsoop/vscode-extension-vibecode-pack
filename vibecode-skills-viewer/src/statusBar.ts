import * as vscode from 'vscode';
import { collectAllSkills } from './sources';
import { t, onDidChangeLocale } from './i18n';

let item: vscode.StatusBarItem | null = null;

export function refresh(): void {
  if (!item) return;
  const all = collectAllSkills({});
  const ws = all.filter(x => x.source.scope === 'workspace').length;
  const total = all.length;
  item.text = `$(book) ${total}${ws ? ` · ws ${ws}` : ''}`;
  const wsSuffix = ws ? t('statusBar.workspaceSuffix', ws) : '';
  item.tooltip = t('statusBar.tooltip', total, wsSuffix);
  item.command = 'vibecodeSkills.search';
}

export function activate(context: vscode.ExtensionContext): void {
  item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 80);
  context.subscriptions.push(item, onDidChangeLocale(() => refresh()));
  refresh();
  item.show();
}
