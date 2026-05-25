// Quickpick to switch the active encryption strategy. Reachable from the
// status bar item and the command palette.

import * as vscode from 'vscode';
import { SETTING_KEY, STRATEGY_ID, type StrategyId } from '../crypto';

export const COMMAND_ID = 'vibecode-env-viewer-encryption.selectStrategy';

interface StrategyPick extends vscode.QuickPickItem {
  id: StrategyId;
}

export function registerSelectStrategy(_context: vscode.ExtensionContext): vscode.Disposable {
  return vscode.commands.registerCommand(COMMAND_ID, async () => {
    const items: StrategyPick[] = [
      { id: STRATEGY_ID.NONE,     label: 'none',     description: vscode.l10n.t('config.strategy.none.description') },
      { id: STRATEGY_ID.DOTENVX,  label: 'dotenvx',  description: vscode.l10n.t('config.strategy.dotenvx.description') },
      { id: STRATEGY_ID.INFISICAL, label: 'infisical', description: vscode.l10n.t('config.strategy.infisical.description') }
    ];

    const current = vscode.workspace.getConfiguration().get<string>(SETTING_KEY.STRATEGY);
    const picked = await vscode.window.showQuickPick(items, {
      placeHolder: vscode.l10n.t('Select encryption strategy'),
      title: vscode.l10n.t('Strategy'),
      // VSCode 1.85+ allows preselection via activeItems; quickpick API call
      // doesn't take it directly, so we sort current to top.
      ignoreFocusOut: false
    });
    if (!picked || picked.id === current) return;

    await vscode.workspace
      .getConfiguration()
      .update(SETTING_KEY.STRATEGY, picked.id, vscode.ConfigurationTarget.Workspace);

    void vscode.window.showInformationMessage(
      vscode.l10n.t('Strategy changed to {0}.', picked.id)
    );
  });
}
