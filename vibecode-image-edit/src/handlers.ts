
import * as vscode from 'vscode';
import * as path from 'path';
import type { WebviewToHost } from './messages';

export interface HandlerContext {
  source: vscode.Uri;
}

export async function handle(msg: WebviewToHost, ctx: HandlerContext): Promise<void> {
  switch (msg.type) {
    case 'savePng':
      await savePng(ctx.source, msg.base64);
      return;
    case 'copyText':
      await vscode.env.clipboard.writeText(msg.text);
      vscode.window.setStatusBarMessage(vscode.l10n.t('Copied to clipboard.'), 1500);
      return;
  }
}

async function savePng(source: vscode.Uri, base64: string): Promise<void> {
  try {
    const bytes = decodeBase64(base64);
    const outUri = nextOutputUri(source);
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
  const ts = formatTimestamp(new Date());
  return vscode.Uri.file(path.join(dir, `${stem}-${ts}.png`));
}

function formatTimestamp(d: Date): string {
  const yy = String(d.getFullYear()).slice(-2);
  const mm = pad2(d.getMonth() + 1);
  const dd = pad2(d.getDate());
  const hh = pad2(d.getHours());
  const mi = pad2(d.getMinutes());
  const ss = pad2(d.getSeconds());
  return `${yy}${mm}${dd}${hh}${mi}${ss}`;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}
