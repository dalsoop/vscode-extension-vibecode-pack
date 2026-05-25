/// <reference path="./contracts/detail.d.ts" />
import * as vscode from 'vscode';
import { McpServerEntry, MCP_ORIGIN_KIND } from '../../_types';
import { MCP_SOURCE } from '../../sources/_types';
import { DETAIL_PANEL } from './manifest';

let extensionUri: vscode.Uri | undefined;

export namespace DetailPanel {
  let panel: vscode.WebviewPanel | undefined;
  let currentEntry: McpServerEntry | undefined;

  export function init(ctx: vscode.ExtensionContext): void {
    extensionUri = ctx.extensionUri;
  }

  function sourceLabel(entry: McpServerEntry): string {
    if (entry.sourceId === MCP_SOURCE.USER_MCP_JSON) return 'User';
    if (entry.sourceId === MCP_SOURCE.WORKSPACE_MCP_JSON) return `Workspace · ${entry.workspaceFolder ?? ''}`;
    return 'Extension';
  }

  function originLabel(entry: McpServerEntry): string {
    if (entry.origin.kind === MCP_ORIGIN_KIND.FILE) return entry.origin.path;
    return entry.origin.extensionId;
  }

  function serialize(entry: McpServerEntry): DetailContract.SerializedMcpEntry {
    return {
      name: entry.name,
      sourceLabel: sourceLabel(entry),
      transport: entry.transport,
      command: entry.command,
      args: entry.args,
      url: entry.url,
      port: entry.port,
      cwd: entry.cwd,
      env: entry.env,
      rawJson: JSON.stringify(entry.raw, null, 2),
      originLabel: originLabel(entry),
    };
  }

  function htmlFor(webview: vscode.Webview): string {
    if (!extensionUri) throw new Error('DetailPanel.init not called');
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(extensionUri, 'dist', 'views', 'detail-panel', 'client', 'detail-client.js')
    );
    const csp = `default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource}; img-src ${webview.cspSource} data:;`;
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<style>
  body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); padding: 16px; }
  header h1 { display: flex; align-items: center; gap: 8px; margin: 0 0 4px; font-size: 1.4em; }
  .badge { font-size: 0.7em; padding: 2px 6px; border: 1px solid var(--vscode-input-border); border-radius: 4px; }
  .meta { color: var(--vscode-descriptionForeground); margin-bottom: 12px; font-size: 0.9em; }
  .actions { display: flex; gap: 8px; margin-bottom: 16px; }
  button { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; padding: 4px 10px; border-radius: 2px; cursor: pointer; }
  button:hover { background: var(--vscode-button-hoverBackground); }
  h2 { font-size: 1em; margin: 16px 0 4px; text-transform: uppercase; color: var(--vscode-descriptionForeground); }
  pre { background: var(--vscode-textCodeBlock-background); padding: 8px; overflow-x: auto; }
  .env { display: flex; flex-direction: column; gap: 4px; }
  .env-row { display: flex; gap: 6px; align-items: center; }
  .env-key { color: var(--vscode-symbolIcon-variableForeground); }
  .env-val { flex: 1; }
  .env-toggle { font-size: 0.8em; padding: 1px 6px; }
  details summary { cursor: pointer; }
</style>
</head>
<body>
<div id="root"></div>
<script src="${scriptUri}"></script>
</body>
</html>`;
  }

  function create(): vscode.WebviewPanel {
    if (!extensionUri) throw new Error('DetailPanel.init not called');
    const p = vscode.window.createWebviewPanel(
      DETAIL_PANEL.VIEW_TYPE,
      'MCP',
      { viewColumn: vscode.ViewColumn.Beside, preserveFocus: false },
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'dist')],
      }
    );
    p.webview.html = htmlFor(p.webview);
    p.webview.onDidReceiveMessage((msg: DetailContract.Outbound) => {
      if (!currentEntry) return;
      if (msg.type === 'ready') {
        p.webview.postMessage({ type: 'setEntry', entry: serialize(currentEntry) });
      } else if (msg.type === 'copyCommand') {
        void vscode.commands.executeCommand('vibecodeMcpList.copyCommand', currentEntry);
      } else if (msg.type === 'openSource') {
        openSource(currentEntry);
      } else if (msg.type === 'refresh') {
        void vscode.commands.executeCommand('vibecodeMcpList.refresh');
      }
    });
    p.onDidDispose(() => { panel = undefined; });
    return p;
  }

  function openSource(entry: McpServerEntry): void {
    if (entry.origin.kind === MCP_ORIGIN_KIND.FILE) {
      void vscode.workspace.openTextDocument(entry.origin.path).then(doc => vscode.window.showTextDocument(doc));
    } else {
      void vscode.commands.executeCommand('workbench.extensions.action.showExtensionsWithIds', [entry.origin.extensionId]);
    }
  }

  export function show(entry: McpServerEntry): void {
    currentEntry = entry;
    if (!panel) {
      panel = create();
    } else {
      panel.reveal(vscode.ViewColumn.Beside, false);
    }
    panel.title = `MCP · ${entry.name}`;
    panel.webview.postMessage({ type: 'setEntry', entry: serialize(entry) });
  }
}
