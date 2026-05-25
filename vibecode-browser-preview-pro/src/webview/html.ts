import * as vscode from 'vscode';
import { STYLES } from './styles';
import { CLIENT_SCRIPT } from './client-script';
import type { L10nBundle } from '../l10n-bundle';

function randomNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < 32; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

export function buildHtml(webview: vscode.Webview, l10n: L10nBundle): string {
  const nonce = randomNonce();
  const cspSource = webview.cspSource;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; frame-src http://127.0.0.1:* http://localhost:*; connect-src 'none';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>${STYLES}</style>
</head>
<body data-l10n='${esc(JSON.stringify(l10n))}'>
  <div class="toolbar">
    <button id="btn-reload" title="${esc(l10n.reload)}">↻ ${esc(l10n.reload)}</button>
    <button id="btn-edit" title="${esc(l10n.editSource)}">📝 ${esc(l10n.editSource)}</button>
    <button id="btn-open" title="${esc(l10n.openExternal)}">↗ ${esc(l10n.openExternal)}</button>
    <button id="btn-inspector" title="${esc(l10n.inspector)}">🎯 ${esc(l10n.inspector)}</button>
    <button id="btn-save" title="${esc(l10n.saveSnapshot)}">💾 ${esc(l10n.saveSnapshot)}</button>
    <span class="url" id="url-label"></span>
  </div>
  <div class="main">
    <div class="frame-wrap">
      <iframe id="preview-frame" sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-modals"></iframe>
      <div class="overlay" id="overlay">
        <h2 id="overlay-title">${esc(l10n.starting)}</h2>
        <p id="overlay-body"></p>
        <button id="overlay-retry" style="display:none">${esc(l10n.retry)}</button>
      </div>
      <div class="toast" id="toast">
        <span id="toast-msg"></span>
        <button id="toast-action" style="display:none"></button>
      </div>
    </div>
    <aside class="panel" id="panel">
      <div class="panel-section">
        <h3 id="panel-pins-title">${esc(l10n.pins)}</h3>
        <div id="pins-list">
          <div class="panel-empty" id="pins-empty">${esc(l10n.noPins)}</div>
        </div>
      </div>
      <div class="panel-section">
        <h3 id="panel-assets-title">${esc(l10n.assets)}</h3>
        <div id="assets-list"></div>
      </div>
      <div class="panel-section">
        <p class="panel-empty">${esc(l10n.snapshotsHint)}</p>
      </div>
    </aside>
  </div>
  <script nonce="${nonce}">${CLIENT_SCRIPT}</script>
</body>
</html>`;
}
