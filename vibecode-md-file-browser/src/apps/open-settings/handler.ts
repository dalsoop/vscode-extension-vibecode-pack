import * as vscode from 'vscode';

export const handler = async () => {
  await vscode.commands.executeCommand(
    'workbench.action.openSettings',
    '@ext:dalsoop.vibecode-md-file-browser'
  );
};
