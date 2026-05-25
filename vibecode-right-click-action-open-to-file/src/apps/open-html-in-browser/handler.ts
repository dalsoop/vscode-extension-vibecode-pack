import * as vscode from 'vscode';

export async function handler(arg: vscode.Uri | undefined): Promise<void> {
  const uri = arg ?? vscode.window.activeTextEditor?.document.uri;
  if (!uri) {
    vscode.window.showWarningMessage(vscode.l10n.t('No file to open.'));
    return;
  }
  await vscode.env.openExternal(uri);
}
