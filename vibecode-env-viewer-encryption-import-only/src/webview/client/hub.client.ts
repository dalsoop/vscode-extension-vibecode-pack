// Webview client for the encryption hub. Compiled via its own tsconfig.json
// (`module: "none"` + `outFile`) — no imports/exports, no module loader.
// Types come from src/contracts/messages.d.ts via include.

declare const acquireVsCodeApi: () => {
  postMessage(msg: Contracts.HubMsgFromView): void;
  setState?: (state: unknown) => void;
  getState?: () => unknown;
};

(function VibeEnvEncHub() {
  const vscode = acquireVsCodeApi();
  const root = document.getElementById('content')!;

  let current: Contracts.HubInitPayload | null = null;

  window.addEventListener('message', evt => {
    const msg = evt.data as Contracts.HubMsgFromExt;
    if (msg.type === 'init' || msg.type === 'update') {
      current = msg.payload;
      render();
    }
  });

  vscode.postMessage({ type: 'ready' });

  function render(): void {
    if (!current) return;
    const { strategy, files, locale } = current;

    const strategyRow = `
      <div class="strategy-row">
        <span class="label">${esc(locale.strategy)}:</span>
        <span class="strategy-value" data-action="select-strategy">${esc(strategy)}</span>
      </div>
    `;

    const filesHtml = files.length === 0
      ? `<div class="empty">${esc(locale.emptyState)}</div>`
      : `<ul>${files.map(f => renderFile(f, locale)).join('')}</ul>`;

    const hint = `
      <div class="hint">${formatRuntimeHint(locale.runtimeHint)}</div>
    `;

    root.innerHTML = strategyRow
      + `<h2>${esc(locale.workspaceFiles)}</h2>`
      + filesHtml
      + hint;

    wireActions();
  }

  function renderFile(f: Contracts.HubFileSummary, locale: Contracts.HubLocale): string {
    const stateText = formatState(f.state, locale);
    const stateClass = f.state.kind === 'mixed' ? 'mixed'
      : f.state.kind === 'encrypted' ? 'encrypted'
      : f.state.kind === 'plaintext' ? 'plaintext'
      : '';

    const openBtn = `<button data-action="open" data-fs="${esc(f.fsPath)}" class="primary">${esc(locale.openEncrypted)}</button>`;
    const enableBtn = f.hasKeysFile
      ? ''
      : `<button data-action="enable" data-fs="${esc(f.fsPath)}">${esc(locale.enableEncryption)}</button>`;

    return `
      <li>
        <div class="file-path">${esc(f.relativePath)}</div>
        <div class="state ${stateClass}">${esc(stateText)}</div>
        <div class="actions">${openBtn}${enableBtn}</div>
      </li>
    `;
  }

  function formatState(state: Contracts.HubFileState, locale: Contracts.HubLocale): string {
    switch (state.kind) {
      case 'empty':
        return '0 keys';
      case 'plaintext':
        return interpolate(locale.statePlaintext, String(state.total));
      case 'encrypted':
        return interpolate(locale.stateEncrypted, String(state.total));
      case 'mixed':
        return interpolate(locale.stateMixed, String(state.total), String(state.encrypted));
    }
  }

  function wireActions(): void {
    root.querySelectorAll<HTMLElement>('[data-action]').forEach(el => {
      el.addEventListener('click', () => {
        const action = el.dataset.action;
        const fs = el.dataset.fs ?? '';
        if (action === 'select-strategy') {
          vscode.postMessage({ type: 'selectStrategy' });
        } else if (action === 'open' && fs) {
          vscode.postMessage({ type: 'openEncrypted', fsPath: fs });
        } else if (action === 'enable' && fs) {
          vscode.postMessage({ type: 'enableEncryption', fsPath: fs });
        }
      });
    });
  }

  function formatRuntimeHint(template: string): string {
    // Render `code` segments as <code>. Everything else escaped.
    let html = '';
    let lastIdx = 0;
    const re = /`([^`]+)`/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(template)) !== null) {
      html += esc(template.slice(lastIdx, m.index));
      html += `<code>${esc(m[1])}</code>`;
      lastIdx = m.index + m[0].length;
    }
    html += esc(template.slice(lastIdx));
    return html;
  }

  function interpolate(template: string, ...args: string[]): string {
    return template.replace(/\{(\d+)\}/g, (_, idx) => args[Number(idx)] ?? '');
  }

  function esc(s: string): string {
    return s.replace(/[&<>"']/g, c =>
      c === '&' ? '&amp;' :
      c === '<' ? '&lt;' :
      c === '>' ? '&gt;' :
      c === '"' ? '&quot;' :
      '&#39;'
    );
  }
})();
