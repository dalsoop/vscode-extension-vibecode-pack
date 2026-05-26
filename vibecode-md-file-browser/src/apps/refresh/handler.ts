import * as vscode from 'vscode';
import { getState } from '../../state';

export const handler = async () => {
  const { provider } = getState();
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Window,
      title: vscode.l10n.t('Scanning Markdown files...')
    },
    async () => {
      await provider.refresh();
    }
  );
  void vscode.window.setStatusBarMessage(
    vscode.l10n.t('Found {0} Markdown files.', String(provider.count())),
    3000
  );
};
