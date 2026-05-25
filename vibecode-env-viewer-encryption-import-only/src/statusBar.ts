// Status bar item — shows the active encryption strategy. Clicking it opens
// the strategy quickpick. Updates on config change.

import * as vscode from 'vscode';
import { SETTING_KEY, STRATEGY_ID, type StrategyId } from './crypto';

const SELECT_STRATEGY_COMMAND = 'vibecode-env-viewer-encryption.selectStrategy';

let item: vscode.StatusBarItem | null = null;

export function activate(context: vscode.ExtensionContext): void {
  item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 80);
  item.command = SELECT_STRATEGY_COMMAND;
  refresh();
  item.show();
  context.subscriptions.push(
    item,
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration(SETTING_KEY.STRATEGY)) refresh();
    })
  );
}

export function refresh(): void {
  if (!item) return;
  const strategy = readStrategy();
  item.text = `$(lock) ${strategy}`;
  item.tooltip = vscode.l10n.t('Strategy: {0}. Click to change.', strategy);
}

function readStrategy(): StrategyId {
  const raw = vscode.workspace.getConfiguration().get<string>(SETTING_KEY.STRATEGY);
  if (raw === STRATEGY_ID.DOTENVX || raw === STRATEGY_ID.INFISICAL) return raw;
  return STRATEGY_ID.NONE;
}
