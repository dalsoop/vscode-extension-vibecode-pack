import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { readConfig, type CcSkillsConfig } from '../config';
import { bus } from '../bus';
import { log } from '../logger';
import { ROOT as HISTORY_ROOT } from '../preview/versions';
import * as state from '../state';
import { pullOne, getSyncMeta } from '../sync/puller';
import { withId, deriveLabel } from '../sync/targets';
import { buildHtml } from './view';
import type { CanonicalSource, CanonicalSyncMeta } from '../types';

interface StorageInfo {
  historyRoot: string;
  historyExists: boolean;
  totalBytes: number;
  totalFiles: number;
  projects: number;
}

interface CanonicalSourceView extends CanonicalSource {
  meta: CanonicalSyncMeta;
  lastAge?: string;
}

interface SettingsPayload {
  config: CcSkillsConfig;
  storage: StorageInfo;
  favoritesCount: number;
  extensionVersion: string;
  canonicalSources: CanonicalSourceView[];
}

function dirSize(p: string): { bytes: number; files: number } {
  let bytes = 0,
    files = 0;
  if (!fs.existsSync(p)) return { bytes, files };
  for (const e of fs.readdirSync(p, { withFileTypes: true })) {
    const full = path.join(p, e.name);
    if (e.isDirectory()) {
      const sub = dirSize(full);
      bytes += sub.bytes;
      files += sub.files;
    } else {
      try {
        bytes += fs.statSync(full).size;
        files++;
      } catch {}
    }
  }
  return { bytes, files };
}

function formatAge(ms: number): string {
  if (!ms) return '';
  const d = (Date.now() - ms) / 1000;
  if (d < 60) return `${Math.floor(d)}s ago`;
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

function buildPayload(ctx: vscode.ExtensionContext, extensionVersion: string): SettingsPayload {
  const historyExists = fs.existsSync(HISTORY_ROOT);
  const { bytes, files } = dirSize(HISTORY_ROOT);
  const projects = historyExists
    ? fs.readdirSync(HISTORY_ROOT, { withFileTypes: true }).filter(e => e.isDirectory()).length
    : 0;
  const cfg = readConfig();
  const canonicalSources: CanonicalSourceView[] = cfg.canonicalSources.map(s => {
    const meta = getSyncMeta(ctx, s.id);
    return { ...s, meta, lastAge: meta.lastSync ? formatAge(meta.lastSync) : undefined };
  });
  return {
    config: cfg,
    storage: { historyRoot: HISTORY_ROOT, historyExists, totalBytes: bytes, totalFiles: files, projects },
    favoritesCount: state.listFavorites().length,
    extensionVersion,
    canonicalSources
  };
}

async function updateKey(key: keyof CcSkillsConfig, value: any): Promise<void> {
  const cfg = vscode.workspace.getConfiguration('claudeCodexSkills');
  await cfg.update(key, value, vscode.ConfigurationTarget.Global);
}

let activePanel: vscode.WebviewPanel | null = null;

async function handleMessage(
  msg: any,
  panel: vscode.WebviewPanel,
  ctx: vscode.ExtensionContext,
  extensionVersion: string
): Promise<void> {
  if (!msg) return;
  const send = () => panel.webview.postMessage({ type: 'payload', payload: buildPayload(ctx, extensionVersion) });

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
    case 'open-history-folder':
      vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(HISTORY_ROOT));
      return;
    case 'clear-history': {
      if (!fs.existsSync(HISTORY_ROOT)) return;
      const ans = await vscode.window.showWarningMessage(
        `Delete all snapshot history?\n${HISTORY_ROOT}`,
        { modal: true },
        'Delete'
      );
      if (ans !== 'Delete') return;
      fs.rmSync(HISTORY_ROOT, { recursive: true, force: true });
      send();
      vscode.window.setStatusBarMessage('Snapshot history cleared', 2500);
      return;
    }
    case 'clear-favorites': {
      const ans = await vscode.window.showWarningMessage('Clear all favorites?', { modal: true }, 'Clear');
      if (ans !== 'Clear') return;
      const list = state.listFavorites();
      for (const dir of list) await state.toggleFavorite(dir);
      bus.emit('favorites-changed');
      send();
      return;
    }
    case 'open-vscode-settings':
      vscode.commands.executeCommand('workbench.action.openSettings', '@ext:dalsoop.claude-codex-skills-viewer');
      return;
    case 'reload-window':
      vscode.commands.executeCommand('workbench.action.reloadWindow');
      return;

    // ── Canonical Sources ──
    case 'canonical-add': {
      const url = String(msg.url || '').trim();
      const target = String(msg.target || '').trim();
      if (!url || !target) {
        panel.webview.postMessage({ type: 'error', message: 'URL and target are required.' });
        return;
      }
      const src = withId({
        url,
        target,
        label: msg.label || deriveLabel(url),
        autoSync: !!msg.autoSync
      });
      const cfg = vscode.workspace.getConfiguration('claudeCodexSkills');
      const cur = cfg.get<CanonicalSource[]>('canonicalSources', []);
      const next = [...cur.filter(s => s.id !== src.id), src];
      await cfg.update('canonicalSources', next, vscode.ConfigurationTarget.Global);
      send();
      return;
    }
    case 'canonical-remove': {
      const cfg = vscode.workspace.getConfiguration('claudeCodexSkills');
      const cur = cfg.get<CanonicalSource[]>('canonicalSources', []);
      await cfg.update(
        'canonicalSources',
        cur.filter(s => s.id !== msg.id),
        vscode.ConfigurationTarget.Global
      );
      send();
      return;
    }
    case 'canonical-toggle-autosync': {
      const cfg = vscode.workspace.getConfiguration('claudeCodexSkills');
      const cur = cfg.get<CanonicalSource[]>('canonicalSources', []);
      const next = cur.map(s => (s.id === msg.id ? { ...s, autoSync: !!msg.autoSync } : s));
      await cfg.update('canonicalSources', next, vscode.ConfigurationTarget.Global);
      send();
      return;
    }
    case 'canonical-pull': {
      const cfg = vscode.workspace.getConfiguration('claudeCodexSkills');
      const cur = cfg.get<CanonicalSource[]>('canonicalSources', []);
      const src = cur.find(s => s.id === msg.id);
      if (!src) return;
      const result = await pullOne(ctx, src);
      if (!result.ok) {
        panel.webview.postMessage({ type: 'error', message: `Pull failed: ${result.error}` });
      } else if (result.unchanged) {
        vscode.window.setStatusBarMessage(`No change: ${src.label}`, 2000);
      } else {
        vscode.window.setStatusBarMessage(`Pulled ${src.label}`, 2500);
      }
      send();
      return;
    }
    case 'canonical-pull-all': {
      const cfg = vscode.workspace.getConfiguration('claudeCodexSkills');
      const cur = cfg.get<CanonicalSource[]>('canonicalSources', []);
      let ok = 0,
        changed = 0,
        failed = 0;
      for (const src of cur) {
        const r = await pullOne(ctx, src);
        if (r.ok) {
          ok++;
          if (!r.unchanged) changed++;
        } else failed++;
      }
      vscode.window.showInformationMessage(`Pulled ${ok}/${cur.length}. ${changed} changed, ${failed} failed.`);
      send();
      return;
    }
    case 'canonical-open-target': {
      if (msg.target && fs.existsSync(msg.target)) {
        await vscode.window.showTextDocument(vscode.Uri.file(msg.target));
      } else {
        vscode.window.showWarningMessage(`Target not found yet: ${msg.target}`);
      }
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
    'claudeCodexSkillsSettings',
    'Claude & Codex Skills · Settings',
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
    handleMessage(msg, activePanel!, context, extensionVersion).catch(e => log.error('settings msg', e));
  });
  activePanel.onDidDispose(() => {
    activePanel = null;
  });
}
