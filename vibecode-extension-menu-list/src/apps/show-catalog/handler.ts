import * as vscode from 'vscode';
import { loadCatalog } from '../../catalog';

interface PickItem extends vscode.QuickPickItem {
  commandId: string;
}

export async function handler(): Promise<void> {
  const catalog = await loadCatalog();

  const items: PickItem[] = [];
  for (const ext of catalog) {
    for (const cmd of ext.commands) {
      items.push({
        label: cmd.title,
        description: cmd.category,
        detail: `${ext.displayName}  •  ${cmd.commandId}`,
        commandId: cmd.commandId
      });
    }
  }

  if (items.length === 0) {
    vscode.window.showInformationMessage(
      vscode.l10n.t('No vibecode-* extensions with commands found.')
    );
    return;
  }

  items.sort((a, b) => (a.detail ?? '').localeCompare(b.detail ?? ''));

  const picked = await vscode.window.showQuickPick(items, {
    title: vscode.l10n.t('Vibecode extension command catalog ({0} commands)', String(items.length)),
    placeHolder: vscode.l10n.t('Type to filter — select to run'),
    matchOnDescription: true,
    matchOnDetail: true
  });
  if (!picked) return;

  try {
    await vscode.commands.executeCommand(picked.commandId);
  } catch (err) {
    vscode.window.showErrorMessage(
      vscode.l10n.t('Failed to run {0}: {1}', picked.commandId, String((err as Error).message))
    );
  }
}
