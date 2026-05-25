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

export function buildHtml(webview: vscode.Webview, l10n: L10nBundle, codiconCssUri: vscode.Uri): string {
  const nonce = randomNonce();
  const cspSource = webview.cspSource;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; font-src ${cspSource}; script-src 'nonce-${nonce}'; frame-src http://127.0.0.1:* http://localhost:*; connect-src 'none';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="stylesheet" href="${codiconCssUri}" />
  <style>${STYLES}</style>
</head>
<body data-l10n='${esc(JSON.stringify(l10n))}'>
  <div class="toolbar">
    <button id="btn-reload" title="${esc(l10n.reload)}"><span class="codicon codicon-refresh"></span>${esc(l10n.reload)}</button>
    <button id="btn-edit" title="${esc(l10n.editSource)}"><span class="codicon codicon-edit"></span>${esc(l10n.editSource)}</button>
    <button id="btn-open" title="${esc(l10n.openExternal)}"><span class="codicon codicon-link-external"></span>${esc(l10n.openExternal)}</button>
    <button id="btn-inspector" title="${esc(l10n.inspector)}"><span class="codicon codicon-inspect"></span>${esc(l10n.inspector)}</button>
    <button id="btn-save" title="${esc(l10n.saveSnapshot)}"><span class="codicon codicon-save"></span>${esc(l10n.saveSnapshot)}</button>
    <span class="url" id="url-label"></span>
    <label class="device-label" title="${esc(l10n.device)}">${esc(l10n.device)}:
      <select id="sel-device">
        <option value="auto">${esc(l10n.deviceAuto)}</option>
        <option value="desktop">${esc(l10n.deviceDesktop)} 1280</option>
        <option value="tablet">${esc(l10n.deviceTablet)} 768</option>
        <option value="mobile">${esc(l10n.deviceMobile)} 375</option>
      </select>
    </label>
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
          <span class="tab-count zero" id="tab-pins-count">0</span>
        </button>
        <button class="panel-tab" data-tab="changes" id="tab-changes">
          <span class="tab-label">${esc(l10n.tabChanges)}</span>
          <span class="tab-count zero" id="tab-changes-count">0</span>
        </button>
        <button class="panel-tab" data-tab="assets" id="tab-assets">
          <span class="tab-label">${esc(l10n.assets)}</span>
          <span class="tab-count zero" id="tab-assets-count">0</span>
        </button>
      </div>
      <div class="panel-warning" id="panel-warning" hidden>
        <span id="panel-warning-text"></span>
        <button class="panel-warning-close" id="panel-warning-close" title="${esc(l10n.dismiss)}" aria-label="${esc(l10n.dismiss)}"><span class="codicon codicon-close"></span></button>
      </div>
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
      <div class="tab-panel" id="tabpanel-assets" data-tab="assets" hidden>
        <div id="assets-list"></div>
      </div>
      <div class="panel-footer">
        <p class="panel-footer-hint">${esc(l10n.snapshotsHint)}</p>
      </div>
    </aside>
  </div>
  <script nonce="${nonce}">${CLIENT_SCRIPT}\n${DIFF_TAB_SCRIPT}</script>
</body>
</html>`;
}
