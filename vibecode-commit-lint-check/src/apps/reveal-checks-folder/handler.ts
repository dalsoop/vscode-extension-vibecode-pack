import * as vscode from 'vscode';

export const handler = () => vscode.commands.executeCommand('vibecodeCommitLint.revealChecksFolder');
