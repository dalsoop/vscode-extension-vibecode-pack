// Open a .env file specifically with our encrypted-import-only custom editor,
// bypassing the default editor for the file pattern. Used by the hub "Open
// Encrypted" button — the user has already declared intent.

import * as vscode from 'vscode';
import { VIEW_TYPE as ENCRYPTED_EDITOR_VIEW_TYPE } from '../editor-provider';

export const COMMAND_ID = 'vibecode-env-viewer-encryption.openEncrypted';

export function registerOpenEncrypted(_context: vscode.ExtensionContext): vscode.Disposable {
  return vscode.commands.registerCommand(COMMAND_ID, async (uri?: vscode.Uri) => {
    if (!uri) return;
    await vscode.commands.executeCommand('vscode.openWith', uri, ENCRYPTED_EDITOR_VIEW_TYPE);
  });
}
