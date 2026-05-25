import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import type { Selection } from '../../sidebar';

/**
 * Apply all sidebar-checked template/tool variants into a single target folder.
 *
 * Called by the sidebar's view-title 🚀 Apply Selected button (and via palette).
 * The provider is injected at extension activation; the handler exported here is a
 * thin shell — the real entry is `applyHandler(provider)` below, wired in extension.ts.
 */
export async function handler(): Promise<void> {
  // Sidebar-less invocations from arbitrary contexts shouldn't happen — extension.ts wires
  // applyHandler(provider) directly. Keep this as a defensive no-op + helpful warning.
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

    // Aggregate conflicts across all selected variants — single modal for the whole install.
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

async function findConflicts(srcRoot: string, dstRoot: string): Promise<string[]> {
  const conflicts: string[] = [];
  const walk = async (srcDir: string, relDir: string): Promise<void> => {
    const entries = await fs.promises.readdir(srcDir, { withFileTypes: true });
    for (const e of entries) {
      const rel = relDir ? path.join(relDir, e.name) : e.name;
      const dst = path.join(dstRoot, rel);
      if (e.isDirectory()) {
        await walk(path.join(srcDir, e.name), rel);
      } else if (e.isFile()) {
        try {
          await fs.promises.access(dst);
          conflicts.push(rel);
        } catch {
          // doesn't exist — no conflict
        }
      }
    }
  };
  await walk(srcRoot, '');
  return conflicts.sort();
}

interface CopyOpts {
  overwrite: boolean;
}

async function copyTree(srcRoot: string, dstRoot: string, opts: CopyOpts): Promise<void> {
  const walk = async (srcDir: string, dstDir: string): Promise<void> => {
    await fs.promises.mkdir(dstDir, { recursive: true });
    const entries = await fs.promises.readdir(srcDir, { withFileTypes: true });
    for (const e of entries) {
      const src = path.join(srcDir, e.name);
      const dst = path.join(dstDir, e.name);
      if (e.isDirectory()) {
        await walk(src, dst);
      } else if (e.isFile()) {
        const exists = await fileExists(dst);
        if (exists && !opts.overwrite) continue;
        await fs.promises.copyFile(src, dst);
      }
    }
  };
  await walk(srcRoot, dstRoot);
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.promises.access(p);
    return true;
  } catch {
    return false;
  }
}
