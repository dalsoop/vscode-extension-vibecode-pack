import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Install a project starter kit into a user-picked target folder.
 *
 * Trigger modes:
 *   - sidebar item click   → `arg` is the starter folder Uri (under <extension>/starters/<name>/)
 *   - palette / sidebar [Install] button → `arg` undefined; QuickPick from bundled starters
 *
 * Flow:
 *   1. Resolve starter folder (pick if not provided)
 *   2. Folder picker for target (default: workspace root)
 *   3. Confirm overwrite if any conflict
 *   4. Recursive copy starter contents into target (preserves directory structure, including dotfiles)
 *   5. Reveal the target folder in Explorer
 */
export async function handler(arg: vscode.Uri | undefined): Promise<void> {
  const starterRoot = arg ?? (await pickStarter());
  if (!starterRoot) return;

  const target = await pickTargetFolder();
  if (!target) return;

  const conflicts = await findConflicts(starterRoot.fsPath, target.fsPath);
  if (conflicts.length > 0) {
    const sample = conflicts.slice(0, 5).map(p => `  • ${p}`).join('\n');
    const more = conflicts.length > 5 ? `\n  … +${conflicts.length - 5} more` : '';
    const choice = await vscode.window.showWarningMessage(
      vscode.l10n.t('{0} file(s) already exist in the target folder. Overwrite?', String(conflicts.length)),
      {
        modal: true,
        detail: `${sample}${more}`
      },
      vscode.l10n.t('Overwrite'),
      vscode.l10n.t('Skip existing')
    );
    if (!choice) return;
    const overwrite = choice === vscode.l10n.t('Overwrite');
    await copyTree(starterRoot.fsPath, target.fsPath, { overwrite });
  } else {
    await copyTree(starterRoot.fsPath, target.fsPath, { overwrite: false });
  }

  const starterName = path.basename(starterRoot.fsPath);
  vscode.window.showInformationMessage(
    vscode.l10n.t('Installed "{0}" → {1}', starterName, target.fsPath)
  );
  await vscode.commands.executeCommand('revealInExplorer', target);
}

async function pickStarter(): Promise<vscode.Uri | undefined> {
  const ext = vscode.extensions.getExtension('dalsoop.vibecode-agent-init-this-folder');
  if (!ext) {
    vscode.window.showErrorMessage(vscode.l10n.t('Extension not found.'));
    return undefined;
  }
  const startersDir = vscode.Uri.joinPath(ext.extensionUri, 'starters');
  let entries: fs.Dirent[];
  try {
    entries = await fs.promises.readdir(startersDir.fsPath, { withFileTypes: true });
  } catch {
    vscode.window.showWarningMessage(vscode.l10n.t('No starters available.'));
    return undefined;
  }
  const items = entries
    .filter(e => e.isDirectory())
    .map(e => ({
      label: `$(rocket) ${e.name}`,
      description: e.name,
      uri: vscode.Uri.joinPath(startersDir, e.name)
    }))
    .sort((a, b) => a.description.localeCompare(b.description));
  if (items.length === 0) {
    vscode.window.showWarningMessage(vscode.l10n.t('No starters available.'));
    return undefined;
  }
  const pick = await vscode.window.showQuickPick(items, {
    title: vscode.l10n.t('Pick a starter to install')
  });
  return pick?.uri;
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
