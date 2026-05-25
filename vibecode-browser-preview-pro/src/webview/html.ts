import * as vscode from 'vscode';
import { STYLES } from './styles';
import { CLIENT_SCRIPT } from './client-script';
import { DIFF_TAB_SCRIPT } from './sections/diff-tab';
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
    <label class="device-label" title="${esc(l10n.device)}">${esc(l10n.device)}:
      <select id="sel-device">
        <option value="auto">${esc(l10n.deviceAuto)}</option>
        <option value="desktop">${esc(l10n.deviceDesktop)} 1280</option>
        <option value="tablet">${esc(l10n.deviceTablet)} 768</option>
        <option value="mobile">${esc(l10n.deviceMobile)} 375</option>
      </select>
    </label>
    <span class="url" id="url-label"></span>
  </div>
  <div class="main">
    <div class="frame-wrap">
      <div class="device-frame" id="device-frame" data-mode="auto">
        <iframe id="preview-frame" sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-modals"></iframe>
      </div>
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
      <div class="panel-tabs">
        <button class="panel-tab active" data-tab="pins" id="tab-pins">
          <span class="tab-label">${esc(l10n.pins)}</span>
          <span class="tab-count" id="tab-pins-count">0</span>
        </button>
        <button class="panel-tab" data-tab="changes" id="tab-changes">
          <span class="tab-label">${esc(l10n.tabChanges)}</span>
          <span class="tab-count zero" id="tab-changes-count">▲0</span>
        </button>
      </div>
      <div class="panel-warning" id="panel-warning" hidden></div>
      <div class="tab-panel" id="tabpanel-pins" data-tab="pins">
        <div id="pins-list">
          <div class="panel-empty" id="pins-empty">${esc(l10n.noPins)}</div>
        </div>
      </div>
      <div class="tab-panel" id="tabpanel-changes" data-tab="changes" hidden>
        <div id="changes-list">
          <div class="panel-empty" id="changes-empty">${esc(l10n.changesEmpty)}</div>
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
  <script nonce="${nonce}">${CLIENT_SCRIPT}\n${DIFF_TAB_SCRIPT}</script>
</body>
</html>`;
}
