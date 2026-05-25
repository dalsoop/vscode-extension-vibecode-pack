import * as vscode from 'vscode';

export const handler = () =>
  vscode.commands.executeCommand('workbench.action.openSettings', '@ext:dalsoop.vibecode-commit-lint-check');
