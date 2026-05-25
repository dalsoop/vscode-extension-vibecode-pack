import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

const EXTENSION_ID = 'dalsoop.vibecode-agent-init-this-folder';
const TEMPLATES_SUBDIR = 'templates';
const SETTINGS_NAMESPACE = 'vibecodeAgentInit';
const SETTING_DEFAULT_TOOL = 'defaultTool';

/**
 * Apply a template's tool-variant into a user-picked target folder.
 *
 * Trigger modes:
 *   - sidebar item click   → `arg` is the template folder Uri (`<extension>/templates/<name>/`)
 *   - palette / view button → `arg` is undefined; QuickPick lists templates first
 *
 * Flow:
 *   1. Resolve template (pick if not provided)
 *   2. Resolve tool variant (QuickPick subfolders; default from settings; skip if single-variant)
 *   3. Folder picker for target (default: workspace root)
 *   4. Conflict check → overwrite / skip-existing modal
 *   5. Recursive copy `<template>/<tool>/*` into target
 *   6. Toast + reveal target in Explorer
 */
export async function handler(arg: vscode.Uri | undefined): Promise<void> {
  const templateRoot = arg ?? (await pickTemplate());
  if (!templateRoot) return;

  const tools = await listTools(templateRoot.fsPath);
  if (tools.length === 0) {
    vscode.window.showWarningMessage(
      vscode.l10n.t('Template "{0}" has no tool variants.', path.basename(templateRoot.fsPath))
    );
    return;
  }

  const selectedTools = await pickTools(tools);
  if (!selectedTools || selectedTools.length === 0) return;

  const target = await pickTargetFolder();
  if (!target) return;

  // Aggregate conflicts across all selected tool variants — one modal for the whole install.
  const allConflicts: Array<{ tool: string; rel: string }> = [];
  for (const tool of selectedTools) {
    const variantRoot = vscode.Uri.joinPath(templateRoot, tool);
    const conflicts = await findConflicts(variantRoot.fsPath, target.fsPath);
    for (const rel of conflicts) allConflicts.push({ tool, rel });
  }

  let overwrite = false;
  if (allConflicts.length > 0) {
    const sample = allConflicts.slice(0, 5).map(c => `  • [${c.tool}] ${c.rel}`).join('\n');
    const more = allConflicts.length > 5 ? `\n  … +${allConflicts.length - 5} more` : '';
    const choice = await vscode.window.showWarningMessage(
      vscode.l10n.t('{0} file(s) already exist in the target folder. Overwrite?', String(allConflicts.length)),
      { modal: true, detail: `${sample}${more}` },
      vscode.l10n.t('Overwrite'),
      vscode.l10n.t('Skip existing')
    );
    if (!choice) return;
    overwrite = choice === vscode.l10n.t('Overwrite');
  }

  for (const tool of selectedTools) {
    const variantRoot = vscode.Uri.joinPath(templateRoot, tool);
    await copyTree(variantRoot.fsPath, target.fsPath, { overwrite });
  }

  vscode.window.showInformationMessage(
    vscode.l10n.t(
      'Installed {0} → {1}  ({2} tool(s): {3})',
      path.basename(templateRoot.fsPath),
      target.fsPath,
      String(selectedTools.length),
      selectedTools.join(', ')
    )
  );
  await vscode.commands.executeCommand('revealInExplorer', target);
}

async function pickTemplate(): Promise<vscode.Uri | undefined> {
  const ext = vscode.extensions.getExtension(EXTENSION_ID);
  if (!ext) {
    vscode.window.showErrorMessage(vscode.l10n.t('Extension not found.'));
    return undefined;
  }
  const dir = vscode.Uri.joinPath(ext.extensionUri, TEMPLATES_SUBDIR);
  let entries: fs.Dirent[];
  try {
    entries = await fs.promises.readdir(dir.fsPath, { withFileTypes: true });
  } catch {
    vscode.window.showWarningMessage(vscode.l10n.t('No templates available.'));
    return undefined;
  }
  const templates = entries.filter(e => e.isDirectory()).map(e => e.name).sort();
  if (templates.length === 0) {
    vscode.window.showWarningMessage(vscode.l10n.t('No templates available.'));
    return undefined;
  }
  const pick = await vscode.window.showQuickPick(
    templates.map(name => ({ label: `$(rocket) ${name}`, name })),
    { title: vscode.l10n.t('Pick a template') }
  );
  return pick ? vscode.Uri.joinPath(dir, pick.name) : undefined;
}

async function pickTools(tools: string[]): Promise<string[] | undefined> {
  if (tools.length === 1) return [tools[0]];
  const defaultTool = vscode.workspace
    .getConfiguration(SETTINGS_NAMESPACE)
    .get<string>(SETTING_DEFAULT_TOOL, 'claude');
  // Re-order tools so the default (if present) is first; pre-check it.
  const ordered = tools.includes(defaultTool)
    ? [defaultTool, ...tools.filter(t => t !== defaultTool)]
    : tools;
  const items = ordered.map(t => ({
    label: t,
    description: t === defaultTool ? vscode.l10n.t('default') : undefined,
    tool: t,
    picked: t === defaultTool
  }));
  const picks = await vscode.window.showQuickPick(items, {
    title: vscode.l10n.t('Pick tool variants (multi-select, space to toggle)'),
    canPickMany: true
  });
  return picks?.map(p => p.tool);
}

async function listTools(templateDir: string): Promise<string[]> {
  try {
    const entries = await fs.promises.readdir(templateDir, { withFileTypes: true });
    return entries.filter(e => e.isDirectory()).map(e => e.name).sort();
  } catch {
    return [];
  }
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
