
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
      <nav class="tabs">
        <button class="tab active" data-tab="eyedropper" id="tab-eyedropper"></button>
        <button class="tab" data-tab="chroma" id="tab-chroma"></button>
        <button class="tab" data-tab="crop" id="tab-crop"></button>
      </nav>
    </header>

    <main class="main">
      <div class="stage" id="stage">
        <canvas id="canvas-display"></canvas>
        <div class="selection-box" id="selection-box" hidden></div>
        <div id="loading" class="loading"></div>
      </div>

      <aside class="side" id="side">
        <section class="panel" data-panel="eyedropper">
          <p class="hint" id="hint-eyedropper"></p>
          <div class="swatch-row">
            <div class="swatch" id="eye-swatch"></div>
            <div class="readout">
              <div class="readout-row"><span class="readout-key" id="eye-hex-key"></span><code class="readout-val" id="eye-hex-val">—</code><button class="copy-btn" data-copy="eye-hex-val"></button></div>
              <div class="readout-row"><span class="readout-key" id="eye-rgb-key"></span><code class="readout-val" id="eye-rgb-val">—</code><button class="copy-btn" data-copy="eye-rgb-val"></button></div>
              <div class="readout-row"><span class="readout-key" id="eye-hsl-key"></span><code class="readout-val" id="eye-hsl-val">—</code><button class="copy-btn" data-copy="eye-hsl-val"></button></div>
            </div>
          </div>
        </section>

        <section class="panel" data-panel="chroma" hidden>
          <label class="form-row">
            <span id="chroma-target-label"></span>
            <span class="input-cluster">
              <span class="swatch small" id="chroma-swatch"></span>
              <input type="text" id="chroma-hex" maxlength="7" placeholder="#00ff00" />
              <button id="chroma-pick"></button>
            </span>
          </label>
          <label class="form-row slider">
            <span id="chroma-tol-label"></span>
            <input type="range" id="chroma-tol" min="0" max="200" value="40" />
            <output id="chroma-tol-val">40</output>
          </label>
          <label class="form-row slider">
            <span id="chroma-soft-label"></span>
            <input type="range" id="chroma-soft" min="0" max="80" value="20" />
            <output id="chroma-soft-val">20</output>
          </label>
          <div class="action-row">
            <button id="chroma-reset"></button>
            <button id="chroma-save" class="primary"></button>
          </div>
        </section>

        <section class="panel" data-panel="crop" hidden>
          <p class="hint" id="hint-crop"></p>
          <div id="crop-status" class="crop-status"></div>
          <div class="action-row">
            <button id="crop-save" class="primary" disabled></button>
          </div>
        </section>
      </aside>
    </main>
  </div>

  <div class="toast" id="toast"></div>

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
