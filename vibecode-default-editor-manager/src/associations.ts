
import * as vscode from 'vscode';

export type AssociationMap = Record<string, string>;

export interface MappingRow {
  pattern: string;
  viewType: string;
  /** Where this mapping currently lives. */
  scope: 'workspace' | 'user' | 'default';
}

const SETTING_KEY = 'workbench.editorAssociations';
const SECTION = 'workbench';
const KEY = 'editorAssociations';

export function readMappings(): MappingRow[] {
  const config = vscode.workspace.getConfiguration(SECTION);
  const inspect = config.inspect<AssociationMap>(KEY);
  const rows: MappingRow[] = [];

  const seen = new Set<string>();
  const workspaceValue = inspect?.workspaceFolderValue ?? inspect?.workspaceValue;
  if (workspaceValue) {
    for (const [pattern, viewType] of Object.entries(workspaceValue)) {
      seen.add(pattern);
      rows.push({ pattern, viewType, scope: 'workspace' });
    }
  }
  const userValue = inspect?.globalValue;
  if (userValue) {
    for (const [pattern, viewType] of Object.entries(userValue)) {
      if (seen.has(pattern)) continue;
      seen.add(pattern);
      rows.push({ pattern, viewType, scope: 'user' });
    }
  }
  const defaultValue = inspect?.defaultValue;
  if (defaultValue) {
    for (const [pattern, viewType] of Object.entries(defaultValue)) {
      if (seen.has(pattern)) continue;
      rows.push({ pattern, viewType, scope: 'default' });
    }
  }

  rows.sort((a, b) => a.pattern.localeCompare(b.pattern));
  return rows;
}

export async function pickScope(prompt: string): Promise<vscode.ConfigurationTarget | null> {
  const items: (vscode.QuickPickItem & { target: vscode.ConfigurationTarget })[] = [];
  if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
    items.push({
      label: vscode.l10n.t('Workspace settings'),
      description: vscode.l10n.t('Scope: writes the mapping to .vscode/settings.json in this workspace.'),
      target: vscode.ConfigurationTarget.Workspace,
    });
  }
  items.push({
    label: vscode.l10n.t('User settings'),
    description: vscode.l10n.t('Scope: writes the mapping to your global user settings.'),
    target: vscode.ConfigurationTarget.Global,
  });

  const picked = await vscode.window.showQuickPick(items, { placeHolder: prompt, ignoreFocusOut: true });
  return picked?.target ?? null;
}

export async function addMapping(pattern: string, viewType: string, target: vscode.ConfigurationTarget): Promise<void> {
  const config = vscode.workspace.getConfiguration(SECTION);
  const inspect = config.inspect<AssociationMap>(KEY);
  const base = pickBase(inspect, target);
  const next: AssociationMap = { ...base, [pattern]: viewType };
  await config.update(KEY, next, target);
}

export async function removeMapping(pattern: string, target: vscode.ConfigurationTarget): Promise<void> {
  const config = vscode.workspace.getConfiguration(SECTION);
  const inspect = config.inspect<AssociationMap>(KEY);
  const base = pickBase(inspect, target);
  if (!(pattern in base)) return;
  const next: AssociationMap = { ...base };
  delete next[pattern];
  await config.update(KEY, Object.keys(next).length ? next : undefined, target);
}

function pickBase(inspect: ReturnType<vscode.WorkspaceConfiguration['inspect']> | undefined, target: vscode.ConfigurationTarget): AssociationMap {
  if (!inspect) return {};
  if (target === vscode.ConfigurationTarget.Workspace) {
    return (inspect.workspaceValue as AssociationMap | undefined) ?? {};
  }
  if (target === vscode.ConfigurationTarget.WorkspaceFolder) {
    return (inspect.workspaceFolderValue as AssociationMap | undefined) ?? {};
  }
  return (inspect.globalValue as AssociationMap | undefined) ?? {};
}

export function settingKey(): string {
  return SETTING_KEY;
}

export function openSetting(): Thenable<unknown> {
  return vscode.commands.executeCommand('workbench.action.openSettings', SETTING_KEY);
}
