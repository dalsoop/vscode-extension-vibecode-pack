import * as vscode from 'vscode';
import type { Selection } from '../../sidebar';
import { findConflicts, copyTree } from '../../copy-utils';

/**
 * Apply all sidebar-checked template/tool variants into a single target folder.
 * The real entry is `applyHandler(getSelections, onAfter)`, wired in extension.ts.
 */
export async function handler(): Promise<void> {
  vscode.window.showWarningMessage(
    vscode.l10n.t('Apply Template must be invoked from the sidebar (no provider attached).')
  );
}

/** Real handler — called by extension.ts with the live provider. */
export function applyHandler(getSelections: () => Selection[], onAfter: () => void) {
  return async (): Promise<void> => {
    const selections = getSelections();
    if (selections.length === 0) {
      vscode.window.showInformationMessage(
        vscode.l10n.t('No tool variants selected. Check items in the sidebar first.')
      );
      return;
    }

    const target = await pickTargetFolder();
    if (!target) return;

    const allConflicts: Array<{ template: string; tool: string; rel: string }> = [];
    for (const s of selections) {
      const conflicts = await findConflicts(s.variantRootUri.fsPath, target.fsPath);
      for (const rel of conflicts) {
        allConflicts.push({ template: s.templateName, tool: s.tool, rel });
      }
    }

    let overwrite = false;
    if (allConflicts.length > 0) {
      const sample = allConflicts
        .slice(0, 5)
        .map(c => `  • [${c.template}/${c.tool}] ${c.rel}`)
        .join('\n');
      const more = allConflicts.length > 5 ? `\n  … +${allConflicts.length - 5} more` : '';
      const choice = await vscode.window.showWarningMessage(
        vscode.l10n.t(
          '{0} file(s) already exist in the target folder. Overwrite?',
          String(allConflicts.length)
        ),
        { modal: true, detail: `${sample}${more}` },
        vscode.l10n.t('Overwrite'),
        vscode.l10n.t('Skip existing')
      );
      if (!choice) return;
      overwrite = choice === vscode.l10n.t('Overwrite');
    }

    for (const s of selections) {
      await copyTree(s.variantRootUri.fsPath, target.fsPath, { overwrite });
    }

    const summary = selections.map(s => `${s.templateName}/${s.tool}`).join(', ');
    vscode.window.showInformationMessage(
      vscode.l10n.t(
        'Installed {0} variant(s) → {1}  ({2})',
        String(selections.length),
        target.fsPath,
        summary
      )
    );
    onAfter();
    await vscode.commands.executeCommand('revealInExplorer', target);
  };
}

async function pickTargetFolder(): Promise<vscode.Uri | undefined> {
  const defaultUri = vscode.workspace.workspaceFolders?.[0]?.uri;
  const picked = await vscode.window.showOpenDialog({
    canSelectFolders: true,
    canSelectFiles: false,
    canSelectMany: false,
    openLabel: vscode.l10n.t('Install here'),
    title: vscode.l10n.t('Pick the target folder'),
    defaultUri
  });
  return picked?.[0];
}
