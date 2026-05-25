import * as vscode from 'vscode';
import * as path from 'path';
import * as state from '../../state';
import { getDataSources, TABS, SCOPES } from '../../data';
import { dispatch } from '../../actions';
import { bus } from '../../bus';
import { log } from '../../logger';
import { buildHtml } from './view';
import { t, getDict, getLocale, onDidChangeLocale } from '../../i18n';
import { readConfig, enabledToolIds } from '../../config';
import type { DataSource, FetchContext, MsgFromView, ActionContext } from '../../types';

export class HubProvider implements vscode.WebviewViewProvider {
  private view: vscode.WebviewView | null = null;
  private readonly sources: DataSource[];
  // Track the active editor's parent dir; only refresh when it actually
  // changes (e.g. switching tabs within the same folder shouldn't re-scan).
  private lastActiveDir: string | null = null;

  constructor(private context: vscode.ExtensionContext) {
    this.sources = getDataSources();
    context.subscriptions.push(
      vscode.window.onDidChangeActiveTextEditor(() => {
        const editor = vscode.window.activeTextEditor;
        const dir = editor ? path.dirname(editor.document.uri.fsPath) : null;
        // Data sources always include "this folder" items, so any folder
        // change can affect what's shown — re-fetch to keep the tree fresh.
        if (dir !== this.lastActiveDir) {
          this.lastActiveDir = dir;
          this.refresh();
        }
        this.sendActiveFolder();
      }),
      bus.on(() => this.refresh()),
      onDidChangeLocale(() => {
        if (!this.view) return;
        this.view.webview.html = buildHtml(this.view.webview, this.context.extensionPath);
        this.sendAll();
      })
    );
  }

  refresh(): void {
    if (this.view?.visible) this.sendAll();
  }

  resolveWebviewView(view: vscode.WebviewView): void {
    this.view = view;
    view.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.file(this.context.extensionPath)]
    };
    view.webview.html = buildHtml(view.webview, this.context.extensionPath);
    view.webview.onDidReceiveMessage((msg: MsgFromView) => {
      this.onMessage(msg).catch(e => log.error('hub onMessage', e));
    });
    view.onDidChangeVisibility(() => {
      if (view.visible) this.sendAll();
    });
    this.sendAll();
  }

  // ---------- ctx ----------

  private buildCtx(): FetchContext {
    const wsFolder = vscode.workspace.workspaceFolders?.[0];
    const editor = vscode.window.activeTextEditor;
    return {
      enabledTools: enabledToolIds(readConfig()),
      activeFolderDir: editor ? path.dirname(editor.document.uri.fsPath) : null,
      workspaceDir: wsFolder ? wsFolder.uri.fsPath : null,
      favorites: new Set(state.listFavorites()),
      extensionPath: this.context.extensionPath
    };
  }

  // ---------- send ----------

  private send(msg: any): void {
    this.view?.webview.postMessage(msg);
  }

  private sendAll(): void {
    const cfg = readConfig();
    const tabs = TABS.map(tab => ({
      ...tab,
      label: t(`hub.tabs.${tab.id}.label`),
      desc: t(`hub.tabs.${tab.id}.desc`)
    }));
    const scopes = SCOPES.map(s => ({ ...s, label: t(`hub.scopes.${s.id}`) }));
    // Tool chip row: enabled tools from user config, prefixed with All.
    const tools: Contracts.Segment[] = [
      { id: 'all', label: t('hub.scopes.all') },
      ...cfg.tools.filter(td => td.enabled).map(td => ({ id: td.id, label: td.label }))
    ];
    this.send({
      type: 'init',
      tabs,
      scopes,
      tools,
      showToolChips: cfg.showToolChips,
      i18n: { locale: getLocale(), dict: getDict() }
    });
    this.sendActiveFolder();
    const ctx = this.buildCtx();
    for (const src of this.sources) {
      Promise.resolve(src.fetch(ctx))
        .then(items => {
          this.send({ type: 'data', tab: src.id, items });
        })
        .catch(e => log.error(`fetch ${src.id} failed`, e));
    }
  }

  private sendActiveFolder(): void {
    const editor = vscode.window.activeTextEditor;
    const dir = editor ? path.dirname(editor.document.uri.fsPath) : null;
    this.send({ type: 'activeFolder', dir, label: dir ? path.basename(dir) : null });
  }

  // ---------- messages ----------

  private async onMessage(msg: MsgFromView): Promise<void> {
    if (!msg) return;
    switch (msg.type) {
      case 'refresh':
        this.refresh();
        return;
      case 'createSkill':
        await vscode.commands.executeCommand('vibecodeSkills.createSkill');
        this.refresh();
        return;
      case 'action': {
        const ctx: ActionContext = { refresh: () => this.refresh() };
        await dispatch(msg.action, msg.payload, ctx);
        return;
      }
    }
  }
}
