import * as vscode from 'vscode';
import { readConfig, type CcSkillsConfig } from '../config';
import { bus } from '../bus';
import { log } from '../logger';
import * as state from '../state';
import type { MirrorGroup } from '../types';
import { PRESETS, expandPreset } from '../mirrors';
import { buildHtml } from './view';
import { t, getDict, getLocale, onDidChangeLocale } from '../i18n';

interface PresetInfo {
  id: string;
  label: string;
  description: string;
  scope: 'global' | 'workspace';
  availablePaths: string[];
}

interface SettingsPayload {
  config: CcSkillsConfig;
  favoritesCount: number;
  extensionVersion: string;
  mirrorPresets: PresetInfo[];
  i18n: { locale: string; dict: Record<string, string> };
}

function buildPayload(extensionVersion: string): SettingsPayload {
  const workspace = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || null;
  const mirrorPresets: PresetInfo[] = PRESETS.map(p => ({
    id: p.id,
    label: p.label,
    description: p.description,
    scope: p.scope,
    availablePaths: expandPreset(p, workspace)
  }));
  return {
    config: readConfig(),
    favoritesCount: state.listFavorites().length,
    extensionVersion,
    mirrorPresets,
    i18n: { locale: getLocale(), dict: getDict() }
  };
}

async function updateKey(key: keyof CcSkillsConfig, value: any): Promise<void> {
  const cfg = vscode.workspace.getConfiguration('vibecodeSkills');
  await cfg.update(key, value, vscode.ConfigurationTarget.Global);
}

let activePanel: vscode.WebviewPanel | null = null;

async function handleMessage(
  msg: Contracts.SettingsMsgFromView | undefined,
  panel: vscode.WebviewPanel,
  extensionVersion: string
): Promise<void> {
  if (!msg) return;
  const send = () => panel.webview.postMessage({ type: 'payload', payload: buildPayload(extensionVersion) });

  switch (msg.type) {
    case 'ready':
      send();
      return;
    case 'set':
      try {
        await updateKey(msg.key, msg.value);
        bus.emit('config-changed');
        send();
      } catch (e: any) {
        log.error('settings set', e);
        panel.webview.postMessage({ type: 'error', message: e.message });
      }
      return;
    case 'clear-favorites': {
      const confirmLabel = t('settings.notice.clearFavoritesConfirm');
      const ans = await vscode.window.showWarningMessage(
        t('settings.notice.clearFavorites'),
        { modal: true },
        confirmLabel
      );
      if (ans !== confirmLabel) return;
      const list = state.listFavorites();
      for (const dir of list) await state.toggleFavorite(dir);
      bus.emit('favorites-changed');
      send();
      return;
    }
    case 'open-vscode-settings':
      vscode.commands.executeCommand('workbench.action.openSettings', '@ext:dalsoop.vibecode-skills-viewer');
      return;
    case 'reload-window':
      vscode.commands.executeCommand('workbench.action.reloadWindow');
      return;

    case 'mirror-apply-preset': {
      const preset = PRESETS.find(p => p.id === msg.presetId);
      if (!preset) {
        panel.webview.postMessage({ type: 'error', message: 'Unknown preset' });
        return;
      }
      const workspace = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || null;
      const paths = expandPreset(preset, workspace);
      if (!paths.length) {
        vscode.window.showWarningMessage(t('settings.notice.presetEmpty', preset.label));
        return;
      }
      const cfg = vscode.workspace.getConfiguration('vibecodeSkills');
      const groups = cfg.get<MirrorGroup[]>('mirrorGroups', []);
      // Avoid duplicate group with same path set
      const sigOf = (ps: string[]) => [...ps].sort().join('\n');
      const want = sigOf(paths);
      if (groups.some(g => sigOf(g.paths) === want)) {
        vscode.window.showInformationMessage(t('settings.notice.presetDuplicate'));
        return;
      }
      const next: MirrorGroup[] = [
        ...groups,
        { id: `${preset.id}-${Date.now()}`, label: preset.label, paths, alwaysMirror: false }
      ];
      await cfg.update('mirrorGroups', next, vscode.ConfigurationTarget.Global);
      vscode.window.setStatusBarMessage(
        t('settings.notice.presetAdded', preset.label, paths.length),
        3000
      );
      send();
      return;
    }
  }
}

export function open(context: vscode.ExtensionContext): void {
  const extensionVersion = context.extension?.packageJSON?.version || '0.0.0';
  if (activePanel) {
    activePanel.reveal(vscode.ViewColumn.Active);
    return;
  }
  activePanel = vscode.window.createWebviewPanel(
    'vibecodeSkillsSettings',
    t('settings.panelTitle'),
    vscode.ViewColumn.Active,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [vscode.Uri.file(context.extensionPath)]
    }
  );
  activePanel.iconPath = new vscode.ThemeIcon('settings-gear');
  activePanel.webview.html = buildHtml(activePanel.webview, context.extensionPath);
  activePanel.webview.onDidReceiveMessage(msg => {
    handleMessage(msg, activePanel!, extensionVersion).catch(e => log.error('settings msg', e));
  });
  const localeSub = onDidChangeLocale(async () => {
    if (!activePanel) return;
    activePanel.title = t('settings.panelTitle');
    activePanel.webview.html = buildHtml(activePanel.webview, context.extensionPath);
    activePanel.webview.postMessage({ type: 'payload', payload: buildPayload(extensionVersion) });
    const reload = t('settings.language.reload');
    const ans = await vscode.window.showInformationMessage(
      t('settings.language.reloadNeeded'),
      reload
    );
    if (ans === reload) vscode.commands.executeCommand('workbench.action.reloadWindow');
  });
  activePanel.onDidDispose(() => {
    localeSub.dispose();
    activePanel = null;
  });
}
