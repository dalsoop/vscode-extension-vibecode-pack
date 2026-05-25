// Encryption hub — WebviewViewProvider for the activity-bar sidebar.
//
// Renders a list of `.env*` files in the workspace with each file's
// encryption state and per-file actions (Open Encrypted / Enable Encryption).
// State changes come from three sources:
//   1. Workspace .env files being created/edited/deleted (fs watcher)
//   2. The user changing the `vibecodeEnvViewerEncryption.strategy` setting
//   3. Explicit refresh command from the view title bar
// Each source funnels through `this.refresh()` which re-scans + re-sends.

import * as vscode from 'vscode';
import { SETTING_KEY, STRATEGY_ID, type StrategyId } from '../../crypto';
import { scanEnvFiles, type EnvFileSummary } from '../../workspace/scan-env-files';
import { buildHtml } from './view';

export const HUB_VIEW_ID = 'vibeEnvEncryption.hub';

export class HubProvider implements vscode.WebviewViewProvider {
  private view: vscode.WebviewView | null = null;
  private readonly disposables: vscode.Disposable[] = [];

  constructor(private readonly context: vscode.ExtensionContext) {
    const watcher = vscode.workspace.createFileSystemWatcher('**/.env*');
    this.disposables.push(
      watcher,
      watcher.onDidCreate(() => this.refresh()),
      watcher.onDidChange(() => this.refresh()),
      watcher.onDidDelete(() => this.refresh()),
      vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration(SETTING_KEY.STRATEGY)) this.refresh();
      })
    );
    context.subscriptions.push(...this.disposables);
  }

  resolveWebviewView(view: vscode.WebviewView): void {
    this.view = view;
    view.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.file(this.context.extensionPath)]
    };
    view.webview.html = buildHtml(view.webview, this.context.extensionPath);
    view.webview.onDidReceiveMessage((msg: Contracts.HubMsgFromView) => {
      this.onMessage(msg).catch(err =>
        console.error('[vibe-env-encryption hub] onMessage failed', err)
      );
    });
    view.onDidChangeVisibility(() => {
      if (view.visible) this.sendAll().catch(() => undefined);
    });
    this.sendAll().catch(() => undefined);
  }

  /** Public — called by the refresh command in view/title and on setting/file changes. */
  refresh(): void {
    if (this.view?.visible) this.sendAll().catch(() => undefined);
  }

  private async sendAll(): Promise<void> {
    if (!this.view) return;
    const payload = await this.buildPayload();
    const msg: Contracts.HubMsgFromExt = { type: 'init', payload };
    this.view.webview.postMessage(msg);
  }

  private async buildPayload(): Promise<Contracts.HubInitPayload> {
    const strategy = readStrategy();
    const files = await scanEnvFiles();
    return {
      strategy,
      files: files.map(toContractFile),
      locale: buildLocale()
    };
  }

  private async onMessage(msg: Contracts.HubMsgFromView): Promise<void> {
    switch (msg.type) {
      case 'ready':
        return this.sendAll();
      case 'selectStrategy':
        await vscode.commands.executeCommand('vibecode-env-viewer-encryption.selectStrategy');
        return;
      case 'openEncrypted':
        await vscode.commands.executeCommand(
          'vibecode-env-viewer-encryption.openEncrypted',
          vscode.Uri.file(msg.fsPath)
        );
        return;
      case 'enableEncryption':
        await vscode.commands.executeCommand(
          'vibecode-env-viewer-encryption.enableEncryption',
          vscode.Uri.file(msg.fsPath)
        );
        return;
    }
  }
}

function readStrategy(): StrategyId {
  const raw = vscode.workspace.getConfiguration().get<string>(SETTING_KEY.STRATEGY);
  return isStrategyId(raw) ? raw : STRATEGY_ID.NONE;
}

function isStrategyId(value: unknown): value is StrategyId {
  return value === STRATEGY_ID.NONE || value === STRATEGY_ID.DOTENVX || value === STRATEGY_ID.INFISICAL;
}

function toContractFile(summary: EnvFileSummary): Contracts.HubFileSummary {
  return {
    fsPath: summary.fsPath,
    relativePath: summary.relativePath,
    state: summary.state,
    hasKeysFile: summary.hasKeysFile
  };
}

function buildLocale(): Contracts.HubLocale {
  return {
    strategy: vscode.l10n.t('Strategy'),
    workspaceFiles: vscode.l10n.t('Workspace .env files'),
    emptyState: vscode.l10n.t('No .env files in this workspace'),
    openEncrypted: vscode.l10n.t('Open Encrypted'),
    enableEncryption: vscode.l10n.t('Enable Encryption'),
    runtimeHint: vscode.l10n.t('Runtime decrypt: `npx dotenvx run -- <cmd>`'),
    stateEncrypted: vscode.l10n.t('{0} keys · all encrypted', '{0}'),
    stateMixed: vscode.l10n.t('{0} keys · {1} encrypted', '{0}', '{1}'),
    statePlaintext: vscode.l10n.t('{0} keys · plaintext', '{0}')
  };
}
