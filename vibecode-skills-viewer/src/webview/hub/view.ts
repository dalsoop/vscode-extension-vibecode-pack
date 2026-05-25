import * as vscode from 'vscode';
import * as path from 'path';
import { t } from '../../i18n';

export const STYLE = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font: 12px -apple-system, system-ui, sans-serif; color: var(--vscode-foreground); background: var(--vscode-sideBar-background); }
  .tabs { display: flex; gap: 0; border-bottom: 1px solid var(--vscode-panel-border); position: sticky; top: 0; background: var(--vscode-sideBar-background); z-index: 10; overflow-x: auto; }
  .tab { padding: 7px 10px; cursor: pointer; border: none; background: transparent; color: var(--vscode-descriptionForeground); font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; white-space: nowrap; border-bottom: 2px solid transparent; }
  .tab:hover { color: var(--vscode-foreground); }
  .tab.active { color: var(--vscode-foreground); border-bottom-color: var(--vscode-focusBorder); }
  .segs { display: flex; gap: 4px; padding: 6px 8px 4px; border-bottom: 1px solid var(--vscode-panel-border); background: var(--vscode-sideBar-background); flex-wrap: wrap; align-items: center; }
  #scopes { position: sticky; top: 31px; z-index: 9; }
  .seg { padding: 2px 9px; cursor: pointer; border: 1px solid var(--vscode-panel-border); background: transparent; color: var(--vscode-descriptionForeground); font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.03em; border-radius: 10px; white-space: nowrap; }
  .seg:hover { background: var(--vscode-toolbar-hoverBackground); color: var(--vscode-foreground); }
  .seg.active { background: var(--vscode-focusBorder); border-color: var(--vscode-focusBorder); color: var(--vscode-button-foreground, #fff); }
  .seg.disabled { opacity: 0.4; cursor: not-allowed; }
  .scope-hint { font-size: 10px; color: var(--vscode-descriptionForeground); opacity: 0.7; margin-left: auto; max-width: 50%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .toolbar { display: flex; gap: 6px; padding: 6px 8px; border-bottom: 1px solid var(--vscode-panel-border); align-items: center; }
  .search { flex: 1; padding: 4px 8px; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border, transparent); border-radius: 3px; font-size: 12px; outline: none; }
  .search:focus { border-color: var(--vscode-focusBorder); }
  .iconbtn { width: 22px; height: 22px; border: none; background: transparent; color: var(--vscode-icon-foreground); cursor: pointer; border-radius: 3px; display: flex; align-items: center; justify-content: center; font-size: 14px; }
  .iconbtn:hover { background: var(--vscode-toolbar-hoverBackground); }
  .content { padding: 4px 0; }
  .group-title { padding: 6px 10px 3px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--vscode-descriptionForeground); }
  .item { padding: 5px 10px 5px 12px; cursor: pointer; display: flex; align-items: flex-start; gap: 6px; border-left: 2px solid transparent; }
  .item:hover { background: var(--vscode-list-hoverBackground); border-left-color: var(--vscode-focusBorder); }
  .item-body { flex: 1; min-width: 0; }
  .item-title { font-size: 12px; font-weight: 500; color: var(--vscode-foreground); display: flex; gap: 4px; align-items: center; }
  .item-subtitle { font-size: 11px; color: var(--vscode-descriptionForeground); margin-top: 1px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .item-meta { font-size: 10px; color: var(--vscode-descriptionForeground); margin-top: 2px; opacity: 0.7; }
  .badge { display: inline-block; padding: 0 4px; border-radius: 3px; font-size: 9px; font-weight: 700; background: var(--vscode-badge-background); color: var(--vscode-badge-foreground); }
  .badge.new { background: var(--vscode-statusBarItem-prominentBackground); color: var(--vscode-statusBarItem-prominentForeground); }
  .badge.star { background: transparent; color: gold; font-size: 12px; padding: 0; }
  .score { display: inline-flex; align-items: center; gap: 3px; padding: 0 5px; border-radius: 8px; font-size: 9px; font-weight: 800; cursor: help; min-width: 28px; justify-content: center; }
  .score.green  { background: #1e7d3a44; color: #6bd58a; border: 1px solid #1e7d3a; }
  .score.lime   { background: #6b8d2244; color: #b7df4d; border: 1px solid #6b8d22; }
  .score.yellow { background: #aa8a0044; color: #f4d03f; border: 1px solid #aa8a00; }
  .score.orange { background: #c66a0044; color: #ff9d3a; border: 1px solid #c66a00; }
  .score.red    { background: #8b1d1d44; color: #ff6363; border: 1px solid #8b1d1d; }
  .score.gray   { background: var(--vscode-badge-background); color: var(--vscode-descriptionForeground); }
  .actions { display: none; gap: 2px; }
  .item:hover .actions { display: flex; }
  .act { width: 20px; height: 20px; border: none; background: transparent; color: var(--vscode-icon-foreground); cursor: pointer; border-radius: 3px; display: flex; align-items: center; justify-content: center; font-size: 12px; }
  .act:hover { background: var(--vscode-toolbar-hoverBackground); }
  .empty { padding: 20px 12px; text-align: center; color: var(--vscode-descriptionForeground); font-style: italic; font-size: 11px; }
  .desc { padding: 4px 10px 6px; color: var(--vscode-descriptionForeground); font-size: 11px; font-style: italic; opacity: 0.8; }
`;

export function buildHtml(webview: vscode.Webview, extensionPath: string): string {
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.file(path.join(extensionPath, 'dist', 'webview', 'client', 'hub.js'))
  );
  const codiconUri = webview.asWebviewUri(
    vscode.Uri.file(path.join(extensionPath, 'dist', 'webview', 'codicons', 'codicon.css'))
  );
  const csp =
    `default-src 'none'; ` +
    `style-src ${webview.cspSource} 'unsafe-inline'; ` +
    `font-src ${webview.cspSource}; ` +
    `script-src ${webview.cspSource};`;
  return /* html */ `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<link rel="stylesheet" href="${codiconUri}">
<style>${STYLE}</style>
</head><body>
<div class="tabs" id="tabs"></div>
<div class="segs" id="scopes"></div>
<div class="toolbar">
  <input class="search" id="q" placeholder="${t('hub.shell.filter')}">
  <button class="iconbtn" id="refresh" title="${t('hub.shell.refresh')}"><span class="codicon codicon-refresh"></span></button>
  <button class="iconbtn" id="add" title="${t('hub.shell.newSkill')}"><span class="codicon codicon-add"></span></button>
</div>
<div class="desc" id="desc"></div>
<div class="content" id="content"><div class="empty">${t('hub.shell.loading')}</div></div>
<script src="${scriptUri}"></script>
</body></html>`;
}
