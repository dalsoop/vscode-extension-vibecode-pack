
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
        content="default-src 'none'; img-src ${cspSource} data:; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; font-src ${cspSource};">
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>${STYLES}</style>
</head>
<body>
  <div class="viewer">
    <div class="toolbar" id="toolbar">
      <span class="filename" id="filename">…</span>
      <span class="dim" id="dim"></span>
      <span class="spacer"></span>
      <div class="zoom-group">
        <button data-zoom="out" title="">−</button>
        <button data-zoom="fit"></button>
        <button data-zoom="100"></button>
        <button data-zoom="in" title="">+</button>
        <span class="zoom-pct" id="zoom-pct">100%</span>
      </div>
      <div class="bg-group">
        <span id="bg-label"></span>
        <button data-bg="checker" class="active"></button>
        <button data-bg="dark"></button>
        <button data-bg="light"></button>
      </div>
    </div>
    <div class="stage" id="stage">
      <div class="stage-inner" id="stage-inner">
        <img id="image" alt="" />
      </div>
      <div class="placeholder" id="placeholder" style="display:none">
        <div class="placeholder-icon">⎚</div>
        <div class="placeholder-text" id="placeholder-text"></div>
      </div>
    </div>
  </div>

  <div class="meta-panel" id="meta-panel">
    <div class="tabbar" id="tabbar">
      <button class="tab" data-tab="overview" id="tab-overview"></button>
      <button class="tab" data-tab="exif" id="tab-exif"></button>
      <button class="tab" data-tab="png-text" id="tab-png-text"></button>
      <button class="tab" data-tab="raw" id="tab-raw"></button>
      <span class="tabbar-spacer"></span>
      <button class="settings-link" id="open-settings" title=""></button>
    </div>

    <div class="tab-panel" id="panel-overview">
      <div class="cards" id="cards-overview"></div>
    </div>

    <div class="tab-panel" id="panel-exif">
      <div class="cards" id="cards-exif"></div>
    </div>

    <div class="tab-panel" id="panel-png-text">
      <div class="png-text-list" id="png-text-list"></div>
      <div class="raw-empty" id="png-text-empty" style="display:none"></div>
    </div>

    <div class="tab-panel" id="panel-raw">
      <div class="raw-section">
        <div class="raw-header">
          <h3 id="raw-title"></h3>
          <div class="raw-actions">
            <button id="raw-toggle"></button>
            <button id="raw-copy"></button>
          </div>
        </div>
        <pre id="raw-body" class="raw-body"></pre>
        <div id="raw-empty" class="raw-empty" style="display:none"></div>
      </div>
    </div>

    <div class="footer-actions">
      <button id="action-reveal"></button>
      <button id="action-copy-path"></button>
      <button id="action-open-os"></button>
      <button id="action-reopen-text"></button>
    </div>
  </div>

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
