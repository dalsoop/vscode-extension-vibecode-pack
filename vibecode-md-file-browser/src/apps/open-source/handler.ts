import * as vscode from 'vscode';
import { resolveMarkdownUri } from '../../utils';

export const handler = async (input?: unknown) => {
  const uri = await resolveMarkdownUri(input);
  if (!uri) return;
  try {
    await vscode.window.showTextDocument(uri, { preview: false });
  } catch (err) {
    await vscode.window.showErrorMessage(
      vscode.l10n.t('Could not open: {0}', String((err as Error)?.message ?? err))
    );
  }
};
