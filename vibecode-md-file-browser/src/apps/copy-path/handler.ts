import * as vscode from 'vscode';
import { resolveMarkdownUri, workspaceRelativePath } from '../../utils';

export const handler = async (input?: unknown) => {
  const uri = await resolveMarkdownUri(input);
  if (!uri) return;
  await vscode.env.clipboard.writeText(workspaceRelativePath(uri));
  void vscode.window.setStatusBarMessage(vscode.l10n.t('Markdown path copied.'), 2500);
};
