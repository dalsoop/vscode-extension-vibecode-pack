// Manual refresh trigger for the hub view title bar. The provider also
// auto-refreshes via the .env* file watcher + config change event; this is
// the user-driven escape hatch.

import * as vscode from 'vscode';
import { HubProvider } from '../webview/hub';

export const COMMAND_ID = 'vibecode-env-viewer-encryption.refreshHub';

export function registerRefreshHub(
  _context: vscode.ExtensionContext,
  provider: HubProvider
): vscode.Disposable {
  return vscode.commands.registerCommand(COMMAND_ID, () => provider.refresh());
}
