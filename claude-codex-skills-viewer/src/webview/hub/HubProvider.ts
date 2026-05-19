import * as vscode from 'vscode';
import * as path from 'path';
import * as state from '../../state';
import { getDataSources, TABS, SCOPES, TOOLS } from '../../data';
import { dispatch } from '../../actions';
import { bus } from '../../bus';
import { log } from '../../logger';
import { buildHtml } from './view';
import type { DataSource, FetchContext, ScopeFilter, ToolFilter, MsgFromView, ActionContext } from '../../types';

export class HubProvider implements vscode.WebviewViewProvider {
  private view: vscode.WebviewView | null = null;
  private scope: ScopeFilter = 'all';
  private tool: ToolFilter = 'all';
  private readonly sources: DataSource[];

  constructor(private context: vscode.ExtensionContext) {
    this.sources = getDataSources();
    context.subscriptions.push(
      vscode.window.onDidChangeActiveTextEditor(() => {
        if (this.scope === 'this') this.refresh();
        this.sendActiveFolder();
      }),
      bus.on(() => this.refresh())
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
      scope: this.scope,
      tool: this.tool,
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
    this.send({ type: 'init', tabs: TABS, scopes: SCOPES, tools: TOOLS, scope: this.scope, tool: this.tool });
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
      case 'setScope':
        this.scope = msg.scope;
        this.refresh();
        return;
      case 'setTool':
        this.tool = msg.tool;
        this.refresh();
        return;
      case 'refresh':
        this.refresh();
        return;
      case 'createSkill':
        await vscode.commands.executeCommand('claudeCodexSkills.createSkill');
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
