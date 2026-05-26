import * as vscode from 'vscode';
import * as path from 'path';
import { ImageEditPanel } from '../../panel';

const SUPPORTED = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp']);

export async function handler(arg: vscode.Uri | undefined): Promise<void> {
  const uri = arg ?? vscode.window.activeTextEditor?.document.uri;
  if (!uri) {
    vscode.window.showWarningMessage(vscode.l10n.t('No image selected.'));
    return;
  }
  const ext = path.extname(uri.fsPath).toLowerCase();
  if (!SUPPORTED.has(ext)) {
    vscode.window.showWarningMessage(vscode.l10n.t('Unsupported image format: {0}', ext));
    return;
  }
  ImageEditPanel.open(uri);
}
