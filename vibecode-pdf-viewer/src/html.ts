import * as vscode from 'vscode';

export function buildHtml(webview: vscode.Webview, distUri: vscode.Uri): string {
  const nonce = randomNonce();
  const cspSource = webview.cspSource;
  const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(distUri, 'webview.js'));
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'none'; img-src ${cspSource} data: blob:; style-src ${cspSource} 'unsafe-inline'; script-src ${cspSource} 'nonce-${nonce}' 'wasm-unsafe-eval'; worker-src ${cspSource} blob:; font-src ${cspSource};">
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>${STYLES}</style>
</head>
<body>
  <div class="root">
    <header class="topbar">
      <span class="filename" id="filename">…</span>
      <div class="page-nav">
        <button id="prev"></button>
        <span class="page-label"><span id="page-label-text"></span> <input type="number" id="page-input" min="1" value="1" /> <span id="page-of"></span></span>
        <button id="next"></button>
      </div>
      <div class="zoom-nav">
        <button id="fit-width"></button>
        <button id="fit-page"></button>
        <button id="zoom-out"></button>
        <span id="zoom-pct">100%</span>
        <button id="zoom-in"></button>
      </div>
      <div class="action-nav">
        <button id="copy-text"></button>
      </div>
    </header>

    <main class="main">
      <div class="stage" id="stage">
        <canvas id="canvas"></canvas>
        <div id="loading" class="loading"></div>
      </div>

      <aside class="side">
        <section class="card">
          <h3 id="meta-title"></h3>
          <dl id="meta-list"></dl>
        </section>
        <section class="card">
          <h3 id="outline-title"></h3>
          <ul id="outline-list"></ul>
          <div id="outline-empty" class="empty" style="display:none"></div>
        </section>
      </aside>
    </main>
  </div>

  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
}

function randomNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let s = '';
  for (let i = 0; i < 32; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

const STYLES = `
:root { color-scheme: light dark; }
* { box-sizing: border-box; }
body, html {
  margin: 0; padding: 0;
  height: 100vh;
  font-family: var(--vscode-font-family);
  font-size: var(--vscode-font-size);
  color: var(--vscode-foreground);
  background: var(--vscode-editor-background);
  overflow: hidden;
}
.root { display: flex; flex-direction: column; height: 100vh; }
.topbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 12px;
  border-bottom: 1px solid var(--vscode-panel-border, rgba(127,127,127,0.2));
  flex-shrink: 0;
  font-size: 0.9em;
  flex-wrap: wrap;
}
.filename {
  font-family: var(--vscode-editor-font-family);
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 1;
  min-width: 0;
}
.page-nav, .zoom-nav, .action-nav { display: flex; align-items: center; gap: 4px; }
.page-nav { margin-left: auto; }
.page-label { display: inline-flex; align-items: center; gap: 4px; font-family: var(--vscode-editor-font-family); }
#page-input {
  width: 48px;
  background: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  border: 1px solid var(--vscode-input-border, transparent);
  border-radius: 3px;
  padding: 2px 4px;
  font-family: inherit;
  font-size: inherit;
  text-align: center;
}
button {
  background: transparent;
  color: var(--vscode-foreground);
  border: 1px solid var(--vscode-button-border, var(--vscode-panel-border));
  padding: 2px 8px;
  border-radius: 3px;
  font-family: inherit;
  font-size: 11px;
  cursor: pointer;
}
button:hover:not(:disabled) { background: var(--vscode-toolbar-hoverBackground); }
button:disabled { opacity: 0.4; cursor: not-allowed; }
#zoom-pct {
  font-family: var(--vscode-editor-font-family);
  color: var(--vscode-descriptionForeground);
  min-width: 3.5em;
  text-align: center;
}
.main { flex: 1; display: flex; min-height: 0; }
.stage {
  flex: 1;
  position: relative;
  overflow: auto;
  background: var(--vscode-editor-background);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 16px;
}
#canvas {
  background: white;
  box-shadow: 0 2px 8px rgba(0,0,0,0.25);
}
.loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--vscode-descriptionForeground);
  background: var(--vscode-editor-background);
}
.loading.hidden { display: none; }
.side {
  width: 280px;
  flex-shrink: 0;
  border-left: 1px solid var(--vscode-panel-border, rgba(127,127,127,0.2));
  background: var(--vscode-sideBar-background, var(--vscode-editor-background));
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.card {
  border: 1px solid var(--vscode-panel-border, rgba(127,127,127,0.2));
  border-radius: 4px;
  padding: 10px 12px;
}
.card h3 {
  margin: 0 0 6px;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--vscode-descriptionForeground);
  font-weight: 600;
}
dl#meta-list {
  margin: 0;
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 2px 10px;
  font-size: 11px;
}
dl#meta-list dt { color: var(--vscode-descriptionForeground); font-family: var(--vscode-editor-font-family); }
dl#meta-list dd { margin: 0; font-family: var(--vscode-editor-font-family); word-break: break-all; }
#outline-list {
  margin: 0;
  padding-left: 14px;
  font-size: 11px;
  line-height: 1.5;
}
#outline-list li { cursor: pointer; }
#outline-list li:hover { color: var(--vscode-textLink-foreground); text-decoration: underline; }
#outline-list ul { padding-left: 14px; margin: 0; list-style: none; }
.empty { color: var(--vscode-descriptionForeground); font-size: 11px; font-style: italic; }
`;
