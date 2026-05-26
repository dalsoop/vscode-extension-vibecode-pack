import * as vscode from 'vscode';

export const handler = () => vscode.commands.executeCommand('vibecodeFileLint.revealChecksFolder');
