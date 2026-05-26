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
        content="default-src 'none'; img-src ${cspSource} data: blob:; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>${STYLES}</style>
</head>
<body>
  <div class="root">
    <header class="topbar">
      <h1 id="filename">…</h1>
    </header>

    <main class="main">
      <div class="stage" id="stage">
        <canvas id="canvas-display"></canvas>
        <div class="selection-box" id="selection-box" hidden></div>
        <div id="loading" class="loading"></div>
      </div>

      <aside class="side">
        <p class="hint" id="hint"></p>

        <section class="form">
          <label class="form-row">
            <span id="style-label"></span>
            <div class="seg" id="style-seg">
              <button class="seg-item active" data-style="blur" id="seg-blur"></button>
              <button class="seg-item" data-style="pixelate" id="seg-pixelate"></button>
              <button class="seg-item" data-style="solid" id="seg-solid"></button>
            </div>
          </label>

          <label class="form-row slider" id="row-strength">
            <span id="strength-label"></span>
            <input type="range" id="strength" min="2" max="40" value="12" />
            <output id="strength-val">12</output>
          </label>

          <label class="form-row slider" id="row-block" hidden>
            <span id="block-label"></span>
            <input type="range" id="block" min="4" max="60" value="16" />
            <output id="block-val">16</output>
          </label>

          <label class="form-row" id="row-color" hidden>
            <span id="color-label"></span>
            <span class="input-cluster">
              <span class="swatch small" id="solid-swatch"></span>
              <input type="text" id="solid-hex" maxlength="7" value="#000000" />
            </span>
          </label>
        </section>

        <section class="regions-section">
          <div class="regions-head">
            <h3 id="regions-title"></h3>
            <button id="clear-all" class="ghost-btn"></button>
          </div>
          <ul class="region-list" id="region-list"></ul>
        </section>

        <div class="action-row">
          <button id="save" class="primary"></button>
        </div>
      </aside>
    </main>
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
