import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export async function handler(arg: vscode.Uri | undefined): Promise<void> {
  const uri = await resolveFolderUri(arg);
  if (!uri) {
    vscode.window.showWarningMessage(vscode.l10n.t('No folder selected.'));
    return;
  }
  await vscode.commands.executeCommand('vscode.openFolder', uri, { forceNewWindow: true });
}

async function resolveFolderUri(arg: vscode.Uri | undefined): Promise<vscode.Uri | undefined> {
  if (!arg) return undefined;
  try {
    const stat = await fs.promises.stat(arg.fsPath);
    if (stat.isDirectory()) return arg;
    return vscode.Uri.file(path.dirname(arg.fsPath));
  } catch {
    return undefined;
  }
}
