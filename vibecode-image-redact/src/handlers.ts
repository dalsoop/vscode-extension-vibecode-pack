import * as vscode from 'vscode';
import * as path from 'path';
import type { WebviewToHost } from './messages';

export interface HandlerContext {
  source: vscode.Uri;
}

export async function handle(msg: WebviewToHost, ctx: HandlerContext): Promise<void> {
  if (msg.type !== 'savePng') return;
  try {
    const bytes = decodeBase64(msg.base64);
    const outUri = nextOutputUri(ctx.source);
    await vscode.workspace.fs.writeFile(outUri, bytes);
    vscode.window.showInformationMessage(vscode.l10n.t('Saved: {0}', path.basename(outUri.fsPath)));
  } catch (err) {
    vscode.window.showErrorMessage(vscode.l10n.t('Save failed: {0}', String((err as Error)?.message ?? err)));
  }
}

function decodeBase64(s: string): Uint8Array {
  const idx = s.indexOf(',');
  const raw = idx >= 0 && s.slice(0, idx).includes('base64') ? s.slice(idx + 1) : s;
  return Buffer.from(raw, 'base64');
}

function nextOutputUri(source: vscode.Uri): vscode.Uri {
  const dir = path.dirname(source.fsPath);
  const stem = path.basename(source.fsPath, path.extname(source.fsPath));
  const d = new Date();
  const ts =
    String(d.getFullYear()).slice(-2) +
    pad2(d.getMonth() + 1) +
    pad2(d.getDate()) +
    pad2(d.getHours()) +
    pad2(d.getMinutes()) +
    pad2(d.getSeconds());
  return vscode.Uri.file(path.join(dir, `${stem}-${ts}.png`));
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}
