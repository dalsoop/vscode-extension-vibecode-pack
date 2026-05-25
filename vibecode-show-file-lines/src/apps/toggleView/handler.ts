import * as vscode from 'vscode';
import type { ExtensionApi } from '../_types';
export const create = (api: ExtensionApi) => () => {
  const next = api.toggleView();
  vscode.window.setStatusBarMessage(vscode.l10n.t('View mode: {0}', next), 2000);
};
