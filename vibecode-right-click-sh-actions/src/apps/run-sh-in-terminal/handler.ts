import * as vscode from 'vscode';
import * as path from 'path';

export async function handler(arg: vscode.Uri | undefined): Promise<void> {
  const uri = arg ?? vscode.window.activeTextEditor?.document.uri;
  if (!uri || !uri.fsPath.endsWith('.sh')) {
    vscode.window.showWarningMessage(vscode.l10n.t('No .sh file selected.'));
    return;
  }

  // Save the editor if this file is open and dirty, so the terminal runs the latest version.
  const openDoc = vscode.workspace.textDocuments.find(d => d.uri.fsPath === uri.fsPath);
  if (openDoc?.isDirty) await openDoc.save();

  const cwd = path.dirname(uri.fsPath);
  const filename = path.basename(uri.fsPath);
  const term = vscode.window.createTerminal({ name: `▶ ${filename}`, cwd });
  term.show();
  term.sendText(`bash ${quoteForShell('./' + filename)}`);
}

function quoteForShell(s: string): string {
  return `'${s.replace(/'/g, "'\\''")}'`;
}
