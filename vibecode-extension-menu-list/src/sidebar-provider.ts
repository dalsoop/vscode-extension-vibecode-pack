import * as vscode from 'vscode';
import { loadCatalog, type ExtensionEntry } from './catalog';

export const SIDEBAR_VIEW_ID = 'vibecodeMenuList.sidebar';

interface WebviewMessage {
  type: 'run' | 'refresh';
  commandId?: string;
}

/**
 * Renders the Vibecode extension catalog as a webview INSIDE the primary
 * sidebar (the panel that slides open when you click the V icon in the
 * Activity Bar). Card click → postMessage → vscode.commands.executeCommand.
 */
export class VibecodeSidebarProvider implements vscode.WebviewViewProvider {
  private view: vscode.WebviewView | undefined;

  constructor(private readonly context: vscode.ExtensionContext) {
    context.subscriptions.push(
      vscode.extensions.onDidChange(() => this.render())
    );
  }

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _resolveContext: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this.view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, 'resources')]
    };

    webviewView.webview.onDidReceiveMessage(async (msg: WebviewMessage) => {
      if (msg?.type === 'run' && typeof msg.commandId === 'string') {
        try {
          await vscode.commands.executeCommand(msg.commandId);
        } catch (err) {
          vscode.window.showErrorMessage(
            vscode.l10n.t('Failed to run {0}: {1}', msg.commandId, String((err as Error).message))
          );
        }
      } else if (msg?.type === 'refresh') {
        await this.render();
      }
    });

    webviewView.onDidDispose(() => {
      if (this.view === webviewView) this.view = undefined;
    });

    void this.render();
  }

  private async render(): Promise<void> {
    if (!this.view) return;
    const catalog = await loadCatalog();
    this.view.webview.html = buildHtml(this.view.webview, catalog);
  }
}

function buildHtml(webview: vscode.Webview, catalog: ExtensionEntry[]): string {
  const nonce = randomNonce();
  const csp = [
    `default-src 'none'`,
    `style-src ${webview.cspSource} 'unsafe-inline'`,
    `script-src 'nonce-${nonce}'`
  ].join('; ');

  const sectionsHtml = catalog
    .map(ext => {
      if (ext.commands.length === 0) return '';
      const cards = ext.commands
        .map(cmd => {
          const search = [cmd.title, cmd.category ?? '', cmd.commandId, ext.displayName, ext.extensionId]
            .join(' ')
            .toLowerCase();
          return /* html */ `
            <button class="card" data-cmd="${escapeAttr(cmd.commandId)}" data-search="${escapeAttr(search)}">
              <span class="card-bar"></span>
              <div class="card-body">
                <div class="card-label">${escapeHtml(cmd.title)}</div>
                <div class="card-meta">${escapeHtml(cmd.commandId)}</div>
              </div>
            </button>
          `;
        })
        .join('');
      return /* html */ `
        <section class="section" data-ext="${escapeAttr(ext.extensionId)}">
          <header class="section-head">
            <h2>${escapeHtml(ext.displayName)}</h2>
          </header>
          <div class="cards">${cards}</div>
        </section>
      `;
    })
    .join('');

  const empty = catalog.length === 0;

  return /* html */ `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="${csp}" />
  <style>
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background: var(--vscode-sideBar-background);
    }
    .wrap { padding: 8px 10px 24px; }
    .toolbar { display: flex; justify-content: flex-end; margin-bottom: 4px; }
    .refresh-btn {
      background: transparent;
      border: 1px solid var(--vscode-button-border, transparent);
      color: var(--vscode-foreground);
      padding: 2px 8px;
      font-size: 11px;
      font-family: inherit;
      cursor: pointer;
      border-radius: 3px;
      opacity: 0.7;
    }
    .refresh-btn:hover {
      background: var(--vscode-list-hoverBackground);
      opacity: 1;
    }
    .filter-row {
      position: sticky;
      top: 0;
      background: var(--vscode-sideBar-background);
      padding-bottom: 8px;
      z-index: 10;
    }
    .filter {
      width: 100%;
      padding: 4px 8px;
      border: 1px solid var(--vscode-input-border, transparent);
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border-radius: 3px;
      font-family: inherit;
      font-size: 12px;
    }
    .filter:focus {
      outline: 1px solid var(--vscode-focusBorder);
      border-color: transparent;
    }
    .section { margin-bottom: 14px; }
    .section-head {
      margin-bottom: 4px;
      padding: 0 4px 2px;
      border-bottom: 1px solid var(--vscode-panel-border, var(--vscode-widget-border));
    }
    .section h2 {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      opacity: 0.75;
      margin: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .cards { display: flex; flex-direction: column; gap: 1px; }
    .card {
      display: flex;
      gap: 8px;
      padding: 5px 6px;
      background: transparent;
      border: 1px solid transparent;
      border-radius: 3px;
      color: inherit;
      font: inherit;
      text-align: left;
      cursor: pointer;
      width: 100%;
    }
    .card:hover { background: var(--vscode-list-hoverBackground); }
    .card:focus-visible {
      outline: 1px solid var(--vscode-focusBorder);
      outline-offset: -1px;
    }
    .card-bar {
      width: 2px;
      background: var(--vscode-textLink-foreground);
      border-radius: 1px;
      flex-shrink: 0;
      opacity: 0.35;
    }
    .card:hover .card-bar { opacity: 1; }
    .card-body { flex: 1; min-width: 0; }
    .card-label {
      font-size: 12px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .card-meta {
      font-size: 10px;
      opacity: 0.5;
      margin-top: 1px;
      font-family: var(--vscode-editor-font-family);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .empty, .no-results {
      text-align: center;
      padding: 20px 10px;
      opacity: 0.6;
      font-size: 12px;
    }
    .no-results { display: none; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="toolbar">
      <button class="refresh-btn" id="refresh">${escapeHtml(vscode.l10n.t('Refresh'))}</button>
    </div>

    <div class="filter-row">
      <input
        class="filter"
        id="filter"
        type="text"
        placeholder="${escapeAttr(vscode.l10n.t('Filter commands…'))}"
        autocomplete="off"
        spellcheck="false"
      />
    </div>

    ${empty
      ? `<div class="empty">${escapeHtml(vscode.l10n.t('No vibecode-* extensions installed.'))}</div>`
      : sectionsHtml}

    <div class="no-results" id="noResults">${escapeHtml(vscode.l10n.t('No matching commands.'))}</div>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();

    document.body.addEventListener('click', (e) => {
      const card = e.target.closest('.card');
      if (card) {
        vscode.postMessage({ type: 'run', commandId: card.dataset.cmd });
        return;
      }
      if (e.target.id === 'refresh') {
        vscode.postMessage({ type: 'refresh' });
      }
    });

    const filter = document.getElementById('filter');
    const noResults = document.getElementById('noResults');
    filter.addEventListener('input', () => {
      const q = filter.value.trim().toLowerCase();
      let anyVisible = false;
      document.querySelectorAll('.section').forEach((section) => {
        let sectionVisible = false;
        section.querySelectorAll('.card').forEach((card) => {
          const match = !q || card.dataset.search.includes(q);
          card.style.display = match ? '' : 'none';
          if (match) sectionVisible = true;
        });
        section.style.display = sectionVisible ? '' : 'none';
        if (sectionVisible) anyVisible = true;
      });
      noResults.style.display = q && !anyVisible ? 'block' : 'none';
    });
  </script>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}

function randomNonce(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let out = '';
  for (let i = 0; i < 32; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}
