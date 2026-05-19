import * as vscode from 'vscode';
import * as path from 'path';

export const STYLE = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font: 13px -apple-system, system-ui, sans-serif; color: var(--vscode-foreground); background: var(--vscode-editor-background); line-height: 1.6; padding: 0; }
  header { padding: 20px 32px 16px; border-bottom: 1px solid var(--vscode-panel-border); }
  h1 { font-size: 22px; margin: 0 0 4px; letter-spacing: -0.3px; }
  .subtitle { color: var(--vscode-descriptionForeground); font-size: 12px; }
  main { max-width: 760px; margin: 0 auto; padding: 24px 32px 60px; }
  section { margin-bottom: 28px; border: 1px solid var(--vscode-panel-border); border-radius: 6px; overflow: hidden; }
  section h2 { font-size: 13px; font-weight: 700; padding: 10px 14px; background: var(--vscode-sideBarSectionHeader-background); border-bottom: 1px solid var(--vscode-panel-border); margin: 0; display: flex; gap: 8px; align-items: center; }
  .body { padding: 16px; }
  .row { display: flex; flex-direction: column; gap: 4px; margin-bottom: 16px; }
  .row:last-child { margin-bottom: 0; }
  .row-label { font-size: 12px; font-weight: 600; }
  .row-hint { font-size: 11px; color: var(--vscode-descriptionForeground); }
  .row-control { margin-top: 4px; }
  .switch { display: inline-flex; align-items: center; gap: 8px; cursor: pointer; }
  .switch input { width: 16px; height: 16px; cursor: pointer; }
  .select { padding: 4px 8px; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border, transparent); border-radius: 3px; font-size: 12px; outline: none; min-width: 200px; }
  .input { width: 100%; padding: 6px 10px; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border, transparent); border-radius: 3px; font-size: 12px; outline: none; font-family: ui-monospace, monospace; }
  .input:focus, .select:focus { border-color: var(--vscode-focusBorder); }
  .radios { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 6px; }
  .radio { display: inline-flex; align-items: center; gap: 4px; cursor: pointer; padding: 4px 10px; border: 1px solid var(--vscode-panel-border); border-radius: 4px; font-size: 12px; }
  .radio:hover { background: var(--vscode-toolbar-hoverBackground); }
  .radio.active { background: var(--vscode-focusBorder); color: var(--vscode-button-foreground, #fff); border-color: var(--vscode-focusBorder); }
  .radio input { display: none; }
  .list { display: flex; flex-direction: column; gap: 4px; margin-top: 6px; }
  .list-row { display: flex; gap: 6px; align-items: center; }
  .list-row input { flex: 1; font-family: ui-monospace, monospace; font-size: 11px; }
  .btn { padding: 4px 10px; border: 1px solid var(--vscode-panel-border); background: transparent; color: var(--vscode-foreground); cursor: pointer; border-radius: 3px; font-size: 11px; display: inline-flex; align-items: center; gap: 4px; }
  .btn:hover { background: var(--vscode-toolbar-hoverBackground); }
  .btn.primary { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border-color: transparent; }
  .btn.primary:hover { background: var(--vscode-button-hoverBackground); }
  .btn.danger { color: var(--vscode-errorForeground); }
  .actions { display: flex; gap: 6px; margin-top: 10px; }
  .info-grid { display: grid; grid-template-columns: max-content 1fr; gap: 6px 14px; font-size: 12px; }
  .info-grid dt { color: var(--vscode-descriptionForeground); }
  .info-grid dd { font-family: ui-monospace, monospace; }
  code.path { font-family: ui-monospace, monospace; font-size: 11px; color: var(--vscode-descriptionForeground); word-break: break-all; }
  .switch.small { font-size: 11px; }
  .switch.small input { width: 14px; height: 14px; }

  /* Canonical Sources */
  .cs-list { display: flex; flex-direction: column; gap: 10px; margin-top: 10px; }
  .cs-card { border: 1px solid var(--vscode-panel-border); border-radius: 5px; padding: 10px 12px; background: var(--vscode-input-background); }
  .cs-head { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
  .cs-title { font-weight: 600; font-size: 12px; flex: 1; }
  .cs-status { font-size: 10px; padding: 2px 8px; border-radius: 8px; display: inline-flex; align-items: center; gap: 4px; }
  .cs-status.ok { background: #1e7d3a44; color: #6bd58a; }
  .cs-status.pending { background: var(--vscode-badge-background); color: var(--vscode-descriptionForeground); }
  .cs-meta { font-size: 11px; line-height: 1.5; }
  .cs-meta > div { display: flex; gap: 6px; align-items: baseline; }
  .cs-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--vscode-descriptionForeground); min-width: 50px; }
  .cs-error { margin-top: 6px; padding: 6px 10px; background: rgba(255, 99, 99, 0.08); border: 1px solid rgba(255, 99, 99, 0.4); border-radius: 4px; font-size: 11px; color: #ff6363; }
  .cs-actions { display: flex; gap: 6px; align-items: center; margin-top: 10px; padding-top: 8px; border-top: 1px solid var(--vscode-panel-border); }
  .cs-empty { padding: 14px; text-align: center; color: var(--vscode-descriptionForeground); font-style: italic; font-size: 11px; }
  .cs-add { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; margin-top: 14px; padding: 10px; background: var(--vscode-input-background); border-radius: 4px; }
  .cs-add .input { flex: 1; min-width: 240px; }
`;

export function buildHtml(webview: vscode.Webview, extensionPath: string): string {
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.file(path.join(extensionPath, 'dist', 'settings', 'client', 'settings.js'))
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
<header>
  <h1>Settings</h1>
  <div class="subtitle">Claude &amp; Codex Skills Viewer · <span id="version"></span></div>
</header>
<main id="main"><p style="text-align:center; padding:40px; color:var(--vscode-descriptionForeground)">Loading…</p></main>
<script src="${scriptUri}"></script>
</body></html>`;
}
