// Assembles the webview HTML document: CSP/nonce + skeleton + injected CSS/JS.
// All hardcoded markup lives here so the provider stays declarative.

import * as vscode from 'vscode';
import { STYLES } from './styles';
import { CLIENT_SCRIPT } from './client-script';

export function buildHtml(webview: vscode.Webview): string {
  const nonce = randomNonce();
  const cspSource = webview.cspSource;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>${STYLES}</style>
</head>
<body>
  <h1 id="title">…</h1>
  <div class="filename" id="filename"></div>
  <div class="hint" id="hint"></div>
  <div class="error" id="error"></div>

  <h2 id="add-section-title"></h2>
  <div class="add-row" id="add-row"></div>

  <h2 id="keys-section-title" style="display:none"></h2>
  <div id="rows"></div>

  <div class="save-hint" id="save-hint"></div>

  <script nonce="${nonce}">${CLIENT_SCRIPT}</script>
</body>
</html>`;
}

function randomNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let s = '';
  for (let i = 0; i < 32; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}
