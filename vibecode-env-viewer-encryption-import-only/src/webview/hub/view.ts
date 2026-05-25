// HTML/CSS for the encryption hub webview. Kept beside HubProvider so the two
// stay in lockstep when the message contract changes.

import * as path from 'path';
import * as vscode from 'vscode';

const STYLE = `
  body { padding: 0 12px; color: var(--vscode-foreground); font-family: var(--vscode-font-family); font-size: var(--vscode-font-size); }
  h2 { font-size: 0.85em; text-transform: uppercase; letter-spacing: 0.06em; color: var(--vscode-descriptionForeground); margin: 18px 0 6px 0; font-weight: 600; }
  .strategy-row { display: flex; align-items: center; gap: 8px; margin: 12px 0 4px 0; }
  .strategy-row .label { color: var(--vscode-descriptionForeground); }
  .strategy-value { padding: 2px 8px; border-radius: 3px; background: var(--vscode-badge-background); color: var(--vscode-badge-foreground); font-family: var(--vscode-editor-font-family); font-size: 0.92em; cursor: pointer; }
  .strategy-value:hover { background: var(--vscode-list-hoverBackground); }
  ul { list-style: none; padding: 0; margin: 0; }
  li { padding: 8px 0; border-bottom: 1px solid var(--vscode-panel-border); }
  li:last-child { border-bottom: none; }
  .file-path { font-family: var(--vscode-editor-font-family); font-size: 0.92em; word-break: break-all; }
  .state { color: var(--vscode-descriptionForeground); font-size: 0.88em; margin: 2px 0 6px 0; }
  .state.encrypted { color: var(--vscode-charts-green); }
  .state.mixed { color: var(--vscode-charts-yellow); }
  .state.plaintext { color: var(--vscode-charts-orange); }
  .actions { display: flex; gap: 6px; flex-wrap: wrap; }
  button { background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); border: none; padding: 3px 10px; font-size: 0.88em; cursor: pointer; border-radius: 2px; }
  button:hover { background: var(--vscode-button-secondaryHoverBackground); }
  button.primary { background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
  button.primary:hover { background: var(--vscode-button-hoverBackground); }
  .empty { color: var(--vscode-descriptionForeground); padding: 12px 0; font-style: italic; }
  .hint { color: var(--vscode-descriptionForeground); font-size: 0.85em; margin: 16px 0 12px 0; padding: 8px; background: var(--vscode-textBlockQuote-background); border-left: 3px solid var(--vscode-textBlockQuote-border); border-radius: 2px; }
  .hint code { font-family: var(--vscode-editor-font-family); }
`;

export function buildHtml(webview: vscode.Webview, extensionPath: string): string {
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.file(path.join(extensionPath, 'dist', 'webview', 'client', 'hub.js'))
  );
  const csp =
    `default-src 'none'; ` +
    `style-src ${webview.cspSource} 'unsafe-inline'; ` +
    `script-src ${webview.cspSource};`;
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="${csp}">
  <style>${STYLE}</style>
</head>
<body>
  <div id="content"></div>
  <script src="${scriptUri}"></script>
</body>
</html>`;
}
