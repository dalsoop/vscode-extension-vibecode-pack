import * as vscode from 'vscode';

export interface L10nBundle {
  reload: string;
  editSource: string;
  openExternal: string;
  starting: string;
  serverError: string;
  retry: string;
  openFolderFirst: string;
  openFolderHint: string;
}

export function getL10nBundle(): L10nBundle {
  return {
    reload: vscode.l10n.t('Reload'),
    editSource: vscode.l10n.t('Edit Source'),
    openExternal: vscode.l10n.t('Open in External Browser'),
    starting: vscode.l10n.t('Starting preview server…'),
    serverError: vscode.l10n.t('Server error: {0}'),
    retry: vscode.l10n.t('Retry'),
    openFolderFirst: vscode.l10n.t('Open a folder first'),
    openFolderHint: vscode.l10n.t('This unsaved HTML file has no folder to serve from. Save it inside a folder or open a workspace folder.')
  };
}
