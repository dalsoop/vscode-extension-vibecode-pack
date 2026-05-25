import * as vscode from 'vscode';

// Defers to the command registered in extension.ts so the provider instance owns refresh state.
export const handler = () => vscode.commands.executeCommand('vibecodeCommitLint.refreshTree');
