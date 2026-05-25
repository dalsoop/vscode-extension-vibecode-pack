// Pure-ish message handlers. Each handler reads/writes a single TextDocument and
// reports back errors via the supplied `postError` callback. UI bookkeeping
// (HTML, webview lifecycle) lives in the provider.

import * as vscode from 'vscode';
import * as parser from './env-parser';
import type { WebviewToHost } from './messages';

export interface HandlerContext {
  document: vscode.TextDocument;
  postError: (message: string) => void;
}

export async function handle(msg: WebviewToHost, ctx: HandlerContext): Promise<void> {
  try {
    switch (msg.type) {
      case 'setValue':
        return await mutate(ctx.document, ls => parser.setValue(ls, msg.key, msg.value));

      case 'clearValue':
        return await mutate(ctx.document, ls => parser.setValue(ls, msg.key, ''));

      case 'addKey':
        return await addKey(ctx, msg.key, msg.value);

      case 'renameKey':
        return await renameKey(ctx, msg.oldKey, msg.newKey);

      case 'requestDelete':
        return await confirmAndDelete(ctx, msg.key);
    }
  } catch (err) {
    ctx.postError(String((err as Error).message ?? err));
  }
}

async function addKey(ctx: HandlerContext, key: string, value: string): Promise<void> {
  if (!parser.KEY_NAME_RE.test(key)) {
    return ctx.postError(invalidKeyError());
  }
  const lines = parser.parse(ctx.document.getText());
  if (parser.keyList(lines).some(e => e.key === key)) {
    return ctx.postError(keyExistsError(key));
  }
  await mutate(ctx.document, ls => parser.setValue(ls, key, value));
}

async function renameKey(ctx: HandlerContext, oldKey: string, newKey: string): Promise<void> {
  if (oldKey === newKey) return;
  if (!parser.KEY_NAME_RE.test(newKey)) {
    return ctx.postError(invalidKeyError());
  }
  const existing = parser.keyList(parser.parse(ctx.document.getText()));
  if (existing.some(e => e.key === newKey)) {
    return ctx.postError(keyExistsError(newKey));
  }
  await mutate(ctx.document, ls => parser.renameKey(ls, oldKey, newKey));
}

async function confirmAndDelete(ctx: HandlerContext, key: string): Promise<void> {
  const choice = await vscode.window.showWarningMessage(
    vscode.l10n.t('Delete key "{0}"?', key),
    {
      modal: true,
      detail: vscode.l10n.t(
        'This removes the key and its value from .env. This cannot be undone (other than via undo on the underlying text editor).'
      )
    },
    vscode.l10n.t('Delete')
  );
  if (!choice) return;
  await mutate(ctx.document, ls => parser.removeKey(ls, key));
}

async function mutate(
  document: vscode.TextDocument,
  fn: (lines: parser.EnvLine[]) => parser.EnvLine[]
): Promise<void> {
  const next = parser.serialize(fn(parser.parse(document.getText())));
  const edit = new vscode.WorkspaceEdit();
  const fullRange = new vscode.Range(
    document.positionAt(0),
    document.positionAt(document.getText().length)
  );
  edit.replace(document.uri, fullRange, next);
  await vscode.workspace.applyEdit(edit);
}

function invalidKeyError(): string {
  return vscode.l10n.t('Invalid key name. Use letters, digits, underscore; start with a letter or underscore.');
}

function keyExistsError(key: string): string {
  return vscode.l10n.t('Key "{0}" already exists.', key);
}
