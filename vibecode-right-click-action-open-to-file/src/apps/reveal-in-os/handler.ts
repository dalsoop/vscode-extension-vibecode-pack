import * as vscode from 'vscode';

export async function handler(arg: vscode.Uri | undefined): Promise<void> {
  const uri = arg ?? vscode.window.activeTextEditor?.document.uri;
  if (!uri) {
    vscode.window.showWarningMessage(vscode.l10n.t('No file or folder to reveal.'));
    return;
  }
  await vscode.commands.executeCommand('revealFileInOS', uri);
}
