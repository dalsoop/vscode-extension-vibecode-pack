import * as vscode from 'vscode';
import * as path from 'path';

export const STYLE = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font: 13px -apple-system, system-ui, sans-serif; color: var(--vscode-foreground); background: var(--vscode-editor-background); line-height: 1.6; padding: 0; }
  header { padding: 18px 28px 14px; border-bottom: 1px solid var(--vscode-panel-border); position: sticky; top: 0; background: var(--vscode-editor-background); z-index: 10; }
  h1.title { font-size: 22px; margin: 0 0 6px; letter-spacing: -0.3px; }
  .meta { color: var(--vscode-descriptionForeground); font-size: 12px; margin: 6px 0 10px; display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
  .badge { display: inline-block; padding: 2px 9px; border-radius: 10px; background: var(--vscode-badge-background); color: var(--vscode-badge-foreground); font-size: 11px; font-weight: 600; }
  .toolbar { display: flex; gap: 4px; flex-wrap: wrap; }
  .tbtn { padding: 4px 10px; border: 1px solid var(--vscode-panel-border); background: transparent; color: var(--vscode-foreground); cursor: pointer; font-size: 11px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px; }
  .tbtn:hover { background: var(--vscode-toolbar-hoverBackground); }
  .tbtn.danger { color: var(--vscode-errorForeground); }
  .tbtn.active { background: var(--vscode-toolbar-activeBackground, var(--vscode-button-secondaryBackground)); border-color: var(--vscode-focusBorder); }
  main { padding: 16px 28px 60px; }
  .layout { display: grid; grid-template-columns: minmax(0, 1fr) 220px; gap: 24px; }
  @media (max-width: 900px) { .layout { grid-template-columns: 1fr; } #toc { display: none; } }
  .content { min-width: 0; }
  #toc { position: sticky; top: 140px; align-self: start; padding: 12px 0; max-height: calc(100vh - 160px); overflow-y: auto; }
  .toc-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--vscode-descriptionForeground); padding: 0 8px 6px; }
  .toc-item { display: flex; align-items: center; gap: 8px; padding: 5px 8px; border-radius: 4px; text-decoration: none; color: var(--vscode-foreground); font-size: 12px; cursor: pointer; }
  .toc-item:hover { background: var(--vscode-list-hoverBackground); }
  .toc-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
  .toc-label { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .toc-score { font-size: 10px; font-weight: 700; min-width: 26px; text-align: right; }
  .section { border: 1px solid var(--vscode-panel-border); border-radius: 6px; margin-bottom: 14px; background: var(--vscode-editor-background); }
  .section-head { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-bottom: 1px solid var(--vscode-panel-border); }
  .section-title { font-size: 13px; font-weight: 600; flex: 1; display: flex; align-items: center; gap: 8px; }
  .kind-pill { font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; padding: 1px 6px; border-radius: 3px; background: var(--vscode-badge-background); color: var(--vscode-badge-foreground); }
  .score { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 700; cursor: help; }
  .score.green  { background: #1e7d3a44; color: #6bd58a; }
  .score.lime   { background: #6b8d2244; color: #b7df4d; }
  .score.yellow { background: #aa8a0044; color: #f4d03f; }
  .score.orange { background: #c66a0044; color: #ff9d3a; }
  .score.red    { background: #8b1d1d44; color: #ff6363; }
  .section-actions { display: flex; gap: 2px; }
  .sa { width: 24px; height: 24px; border: none; background: transparent; color: var(--vscode-icon-foreground); cursor: pointer; border-radius: 3px; display: flex; align-items: center; justify-content: center; font-size: 14px; }
  .sa:hover { background: var(--vscode-toolbar-hoverBackground); }
  .section-body { padding: 12px 14px; }
  .rules-block { margin: 4px 0 12px; }
  .rules-group { padding: 8px 12px; border: 1px solid var(--vscode-panel-border); border-radius: 4px; margin-bottom: 6px; }
  .rules-group.muted { opacity: 0.55; }
  .rules-group-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--vscode-descriptionForeground); margin-bottom: 4px; }
  .rules { list-style: none; padding: 0; margin: 0; font-size: 11px; }
  .rule-li { padding: 3px 0; display: flex; gap: 8px; align-items: center; }
  .rule-li .mark { font-weight: 700; min-width: 14px; text-align: center; }
  .rule-li.rule-fail .mark { color: #ff6363; }
  .rule-li.rule-pass .mark { color: #6bd58a; }
  .rule-li.rule-fail .rule-msg { color: var(--vscode-foreground); font-weight: 500; }
  .rule-li.rule-pass .rule-msg { color: var(--vscode-descriptionForeground); }
  .rule-msg { flex: 1; }
  .rule-pts { font-size: 10px; font-weight: 700; min-width: 36px; text-align: right; font-family: ui-monospace, monospace; }
  .rule-li.rule-fail .rule-pts { color: #ff6363; }
  .rule-li.rule-pass .rule-pts { color: #6bd58a; opacity: 0.8; }
  .fail-count { font-size: 10px; padding: 1px 7px; border-radius: 8px; background: #8b1d1d44; color: #ff6363; border: 1px solid #8b1d1d; }
  .pass-tag { font-size: 10px; padding: 1px 7px; border-radius: 8px; background: #1e7d3a44; color: #6bd58a; border: 1px solid #1e7d3a; }
  .sa.danger { color: var(--vscode-errorForeground); }
  .sa.danger:hover { background: rgba(255, 99, 99, 0.1); }
  .sa.danger.active { background: rgba(255, 99, 99, 0.18); border: 1px solid rgba(255, 99, 99, 0.5); }
  .section.confirming { border-color: #ff6363; box-shadow: 0 0 0 1px rgba(255, 99, 99, 0.35); }

  .delete-confirm {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 12px 14px;
    align-items: center;
    padding: 16px 18px;
    background: rgba(255, 99, 99, 0.06);
    border: 1px solid rgba(255, 99, 99, 0.4);
    border-radius: 6px;
  }
  .dc-icon { font-size: 24px; color: #ff6363; grid-row: span 2; align-self: start; padding-top: 2px; }
  .dc-text { display: flex; flex-direction: column; gap: 4px; }
  .dc-title { font-weight: 700; font-size: 13px; color: #ff6363; }
  .dc-desc { font-size: 12px; color: var(--vscode-foreground); }
  .dc-target { font-family: ui-monospace, monospace; font-size: 11px; color: var(--vscode-descriptionForeground); padding: 4px 8px; background: var(--vscode-input-background); border-radius: 3px; align-self: flex-start; margin-top: 4px; }
  .dc-actions { grid-column: 2; display: flex; gap: 6px; justify-content: flex-end; margin-top: 6px; }
  .tbtn.danger { background: #c62828; color: #fff; border-color: transparent; }
  .tbtn.danger:hover { background: #b71c1c; }

  /* YAML error banner */
  .yaml-error { margin: 0 0 16px; padding: 14px 16px; background: rgba(255, 99, 99, 0.08); border: 1px solid rgba(255, 99, 99, 0.5); border-left-width: 4px; border-radius: 6px; }
  .ye-head { display: flex; gap: 8px; align-items: center; margin-bottom: 6px; }
  .ye-icon { color: #ff6363; font-size: 16px; }
  .ye-msg { font-size: 12px; color: var(--vscode-foreground); margin-bottom: 6px; }
  .ye-msg code { background: var(--vscode-input-background); padding: 1px 5px; border-radius: 3px; font-size: 11px; }
  .ye-snippet { background: var(--vscode-textCodeBlock-background); padding: 8px 10px; border-radius: 4px; font-size: 11px; overflow-x: auto; margin: 6px 0; }
  .ye-hint { font-size: 11px; color: var(--vscode-descriptionForeground); }
  .ye-hint code { background: var(--vscode-input-background); padding: 0 4px; border-radius: 3px; font-size: 10px; }
  .rendered pre { background: var(--vscode-textCodeBlock-background); padding: 10px 12px; border-radius: 4px; overflow-x: auto; font-size: 12px; margin: 8px 0; }
  .rendered code { background: var(--vscode-textCodeBlock-background); padding: 1px 5px; border-radius: 3px; font-size: 12px; font-family: ui-monospace, monospace; }
  .rendered pre code { background: transparent; padding: 0; }
  .rendered ul { padding-left: 22px; margin: 6px 0; }
  .rendered h2, .rendered h3 { font-size: 14px; margin: 12px 0 6px; }
  .rendered p { margin: 6px 0; }
  textarea.editor { width: 100%; min-height: 200px; padding: 10px; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-focusBorder); border-radius: 4px; font-family: ui-monospace, monospace; font-size: 12px; line-height: 1.5; resize: vertical; outline: none; }
  .edit-row { display: flex; gap: 6px; margin-top: 8px; justify-content: flex-end; }
  .versions { margin-top: 10px; border-top: 1px solid var(--vscode-panel-border); padding-top: 10px; }
  .versions-title { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--vscode-descriptionForeground); margin-bottom: 6px; }
  .ver { display: flex; gap: 8px; align-items: center; padding: 4px 0; font-size: 11px; }
  .ver-tag { padding: 0 6px; border-radius: 3px; font-size: 9px; font-weight: 700; text-transform: uppercase; background: var(--vscode-badge-background); }
  .ver-age { color: var(--vscode-descriptionForeground); flex: 1; }
  .ver-actions { display: flex; gap: 4px; }
  .ver-actions button { padding: 2px 8px; border: 1px solid var(--vscode-panel-border); background: transparent; color: var(--vscode-foreground); cursor: pointer; font-size: 10px; border-radius: 3px; }
  .ver-actions button:hover { background: var(--vscode-toolbar-hoverBackground); }
  .aux-files { display: flex; gap: 6px; flex-wrap: wrap; }
  .aux-file { padding: 3px 8px; border: 1px solid var(--vscode-panel-border); border-radius: 3px; cursor: pointer; font-size: 11px; }
  .aux-file:hover { background: var(--vscode-toolbar-hoverBackground); }
  hr { border: none; border-top: 1px solid var(--vscode-panel-border); margin: 18px 0; }

  /* v1.6/1.7 additions */
  .badge.ro   { background: #aa6c0044; color: #e09b3a; border: 1px solid #aa6c00; }
  .badge.warn { background: #c66a0044; color: #ff9d3a; border: 1px solid #c66a00; }
  .badge.mirror { background: #2a5f9e44; color: #7eb8f0; border: 1px solid #2a5f9e; cursor: help; display: inline-flex; align-items: center; gap: 4px; }
  .section.low-score { border-left: 3px solid #ff9d3a; }
  .sa[disabled] { opacity: 0.4; cursor: not-allowed; }
  .rules li { align-items: center; }
  .rule-msg { flex: 1; }
  .fix-btn { padding: 2px 8px; font-size: 10px; border: 1px solid var(--vscode-panel-border); background: transparent; color: var(--vscode-foreground); cursor: pointer; border-radius: 3px; display: inline-flex; align-items: center; gap: 4px; }
  .fix-btn:hover { background: var(--vscode-toolbar-hoverBackground); }
  .tbtn.primary { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border-color: transparent; }
  .tbtn.primary:hover { background: var(--vscode-button-hoverBackground); }
  .fm-form { display: flex; flex-direction: column; gap: 10px; }
  .fm-row { display: flex; flex-direction: column; gap: 4px; }
  .fm-label { font-size: 11px; color: var(--vscode-descriptionForeground); font-weight: 600; display: flex; justify-content: space-between; }
  .fm-hint { opacity: 0.6; font-weight: 400; font-size: 10px; }
  .fm-counter { padding: 0 6px; border-radius: 3px; font-size: 10px; background: var(--vscode-badge-background); color: var(--vscode-badge-foreground); }
  .fm-counter.near { background: #aa8a0044; color: #f4d03f; }
  .fm-counter.over { background: #8b1d1d44; color: #ff6363; }
  .fm-input { padding: 6px 8px; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border, transparent); border-radius: 3px; font-size: 12px; outline: none; }
  .fm-input:focus { border-color: var(--vscode-focusBorder); }
  .fm-textarea { padding: 8px; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border, transparent); border-radius: 3px; font-family: ui-monospace, monospace; font-size: 12px; line-height: 1.5; resize: vertical; outline: none; }
  .fm-textarea:focus { border-color: var(--vscode-focusBorder); }
  pre { position: relative; }
  .code-copy { position: absolute; top: 4px; right: 4px; padding: 3px 6px; border: 1px solid var(--vscode-panel-border); background: var(--vscode-editor-background); color: var(--vscode-icon-foreground); cursor: pointer; border-radius: 3px; opacity: 0; transition: opacity 0.15s; }
  pre:hover .code-copy { opacity: 1; }
  .code-copy.copied { color: #6bd58a; }
`;

export function buildHtml(webview: vscode.Webview, extensionPath: string): string {
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.file(path.join(extensionPath, 'dist', 'preview', 'client', 'preview.js'))
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
  <h1 class="title" id="title">Loading…</h1>
  <div class="meta" id="meta"></div>
  <div class="toolbar" id="toolbar"></div>
</header>
<main id="main"></main>
<script src="${scriptUri}"></script>
</body></html>`;
}
