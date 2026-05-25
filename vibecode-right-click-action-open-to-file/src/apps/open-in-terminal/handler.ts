import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export async function handler(arg: vscode.Uri | undefined): Promise<void> {
  if (!arg) {
    vscode.window.showWarningMessage(vscode.l10n.t('No folder selected.'));
    return;
  }
  let cwd = arg.fsPath;
  try {
    const stat = await fs.promises.stat(cwd);
    if (!stat.isDirectory()) cwd = path.dirname(cwd);
  } catch {
    vscode.window.showWarningMessage(vscode.l10n.t('Cannot open terminal: {0}', cwd));
    return;
  }
  const name = path.basename(cwd);
  const existing = vscode.window.terminals.find(t => t.name === name);
  const term = existing && existing.exitStatus === undefined
    ? existing
    : vscode.window.createTerminal({ name, cwd });
  term.show();
}
