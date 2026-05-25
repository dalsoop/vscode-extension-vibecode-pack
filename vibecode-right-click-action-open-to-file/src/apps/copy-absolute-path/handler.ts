import * as vscode from 'vscode';

export async function handler(arg: vscode.Uri | undefined): Promise<void> {
  const uri = arg ?? vscode.window.activeTextEditor?.document.uri;
  if (!uri) {
    vscode.window.showWarningMessage(vscode.l10n.t('No file or folder selected.'));
    return;
  }
  await vscode.env.clipboard.writeText(uri.fsPath);
  vscode.window.setStatusBarMessage(vscode.l10n.t('Copied: {0}', uri.fsPath), 2000);
}
