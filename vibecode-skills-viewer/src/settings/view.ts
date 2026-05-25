import * as vscode from 'vscode';
import * as path from 'path';
import { t } from '../i18n';

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

  /* Mirror Groups */
  .mg-list { display: flex; flex-direction: column; gap: 10px; margin: 10px 0; }
  .mg-card { border: 1px solid var(--vscode-panel-border); border-radius: 5px; padding: 10px 12px; background: var(--vscode-input-background); }
  .mg-head { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; }
  .mg-head .input.mg-label { flex: 1; font-weight: 600; }
  .cs-empty { padding: 14px; text-align: center; color: var(--vscode-descriptionForeground); font-style: italic; font-size: 11px; }

  /* Top tab navigation */
  .settings-tabs { display: flex; flex-wrap: wrap; gap: 4px; border-bottom: 1px solid var(--vscode-panel-border); margin-bottom: 18px; padding-bottom: 4px; position: sticky; top: 0; background: var(--vscode-editor-background); z-index: 10; }
  .settings-tab { padding: 6px 14px; border: none; background: transparent; color: var(--vscode-descriptionForeground); font-size: 12px; font-weight: 600; cursor: pointer; border-radius: 4px; }
  .settings-tab:hover { background: var(--vscode-toolbar-hoverBackground); color: var(--vscode-foreground); }
  .settings-tab.active { color: var(--vscode-foreground); background: var(--vscode-toolbar-activeBackground, var(--vscode-button-secondaryBackground)); border-bottom: 2px solid var(--vscode-focusBorder); border-radius: 4px 4px 0 0; }
  .settings-content { padding: 0; }

  /* Tool card list (Tools tab) */
  .tool-card-list { display: flex; flex-direction: column; gap: 8px; }
  .tool-card { display: grid; grid-template-columns: auto 1fr auto auto; gap: 10px; align-items: center; padding: 10px 12px; border: 1px solid var(--vscode-panel-border); border-radius: 5px; background: var(--vscode-input-background); }
  .tool-card-enable { display: inline-flex; align-items: center; cursor: pointer; }
  .tool-card-enable input { width: 16px; height: 16px; cursor: pointer; }
  .tool-card-label { font-weight: 600; }
  .tool-card-id { font-family: ui-monospace, monospace; font-size: 11px; color: var(--vscode-descriptionForeground); white-space: nowrap; }
  .tool-card-badge { font-size: 9px; font-weight: 700; padding: 1px 6px; border-radius: 8px; background: var(--vscode-badge-background); color: var(--vscode-badge-foreground); text-transform: uppercase; letter-spacing: 0.04em; margin-left: 4px; }
  .tool-card-delete { width: 28px; height: 28px; padding: 0; display: inline-flex; align-items: center; justify-content: center; }
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
  <h1>${t('settings.title')}</h1>
  <div class="subtitle">${t('settings.subtitle', '<span id="version"></span>')}</div>
</header>
<main id="main"><p style="text-align:center; padding:40px; color:var(--vscode-descriptionForeground)">${t('settings.loading')}</p></main>
<script src="${scriptUri}"></script>
</body></html>`;
}
