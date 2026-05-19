import * as vscode from 'vscode';
import * as state from './state';
import * as commands from './commands';
import * as lmTools from './lmTools';
import * as chat from './chat';
import * as statusBar from './statusBar';
import { HubProvider } from './webview/hub';
import { bus } from './bus';
import { setExtensionPath } from './webview/preview';
import { readConfig } from './config';
import { pullAll } from './sync/puller';
import { log } from './logger';

export function activate(context: vscode.ExtensionContext): void {
  state.init(context);
  setExtensionPath(context.extensionPath);

  const hub = new HubProvider(context);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('ccskills.hub', hub, {
      webviewOptions: { retainContextWhenHidden: true }
    })
  );

  commands.setContext(context);
  commands.register(context, { hub });
  lmTools.registerAll(context);
  chat.register(context);
  statusBar.activate(context);

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('claudeCodexSkills')) bus.emit('config-changed');
    }),
    bus.on(() => statusBar.refresh())
  );

  // Auto-sync canonical sources on startup if enabled
  const cfg = readConfig();
  if (cfg.autoSyncCanonicalOnStartup && cfg.canonicalSources.length > 0) {
    pullAll(context, cfg.canonicalSources, true)
      .then(results => {
        const changed = results.filter(r => r.ok && !r.unchanged).length;
        if (changed > 0) log.info(`Canonical auto-sync: ${changed} file(s) updated`);
      })
      .catch(e => log.error('startup canonical sync failed', e));
  }
}

export function deactivate(): void {}
