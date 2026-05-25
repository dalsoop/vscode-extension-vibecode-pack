import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { detectInstalledTools, copyMarkersForTool, TOOL_MARKERS } from '../../tool-markers';
import { USER_TEMPLATES_ROOT } from '../../sidebar';

/**
 * Promote an existing folder into a new user template.
 *
 * Flow:
 *   1. Pick source folder (default = active workspace root)
 *   2. Detect which tools are present (via TOOL_MARKERS)
 *   3. Prompt for a new template name
 *   4. For each detected tool, copy its marker(s) into
 *      `~/.vibecode-ai-md-system/templates/<name>/<tool>/`
 *   5. Refresh sidebar so the new user template appears immediately
 */
export async function handler(): Promise<void> {
  const source = await pickSource();
  if (!source) return;

  const detected = await detectInstalledTools(source.fsPath);
  if (detected.length === 0) {
    const knownNames = Object.values(TOOL_MARKERS).flat().map(m => m.name).join(', ');
    vscode.window.showWarningMessage(
      vscode.l10n.t('No known tool markers found in this folder. Looking for: {0}', knownNames)
    );
    return;
  }

  const pickedTools = await vscode.window.showQuickPick(
    detected.map(t => ({ label: t, picked: true, tool: t })),
    {
      title: vscode.l10n.t('Tools detected — select which to promote'),
      canPickMany: true
    }
  );
  if (!pickedTools || pickedTools.length === 0) return;

  const name = await vscode.window.showInputBox({
    title: vscode.l10n.t('New template name'),
    prompt: vscode.l10n.t('Saved as ~/.vibecode-ai-md-system/templates/<name>/<tool>/<files>'),
    value: path.basename(source.fsPath),
    validateInput: v => {
      if (!v || !v.trim()) return vscode.l10n.t('Name is required.');
      if (!/^[A-Za-z0-9._-]+$/.test(v)) {
        return vscode.l10n.t('Use only letters, digits, dot, underscore, or hyphen.');
      }
      return null;
    }
  });
  if (!name) return;

  const templateDir = path.join(USER_TEMPLATES_ROOT, name.trim());
  if (fs.existsSync(templateDir)) {
    const choice = await vscode.window.showWarningMessage(
      vscode.l10n.t('User template "{0}" already exists. Overwrite?', name.trim()),
      { modal: true },
      vscode.l10n.t('Overwrite')
    );
    if (!choice) return;
    await fs.promises.rm(templateDir, { recursive: true, force: true });
  }

  let totalMarkers = 0;
  for (const p of pickedTools) {
    const destToolDir = path.join(templateDir, p.tool);
    totalMarkers += await copyMarkersForTool(source.fsPath, p.tool, destToolDir);
  }

  vscode.window.showInformationMessage(
    vscode.l10n.t(
      'Saved user template "{0}" ({1} tool(s), {2} marker(s)). Refreshing sidebar.',
      name.trim(),
      String(pickedTools.length),
      String(totalMarkers)
    )
  );
  // Trigger a refresh — best-effort via command since handler doesn't hold the provider directly.
  await vscode.commands.executeCommand('vibecodeAiMdSystem.refreshTemplates');
}

async function pickSource(): Promise<vscode.Uri | undefined> {
  const defaultUri = vscode.workspace.workspaceFolders?.[0]?.uri;
  const picked = await vscode.window.showOpenDialog({
    canSelectFolders: true,
    canSelectFiles: false,
    canSelectMany: false,
    openLabel: vscode.l10n.t('Use this folder as source'),
    title: vscode.l10n.t('Pick a folder to promote into a user template'),
    defaultUri
  });
  return picked?.[0];
}
