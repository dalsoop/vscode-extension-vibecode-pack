
import * as vscode from 'vscode';
import {
  addMapping,
  openSetting,
  pickScope,
  readMappings,
  removeMapping,
  settingKey,
  type MappingRow,
} from './associations';
import { loadCustomEditors, type CustomEditorEntry } from './registry';

export const SIDEBAR_VIEW_ID = 'vibecodeDefaultEditor.sidebar';

type WebviewMessage =
  | { type: 'refresh' }
  | { type: 'openSetting' }
  | { type: 'addMapping'; pattern: string; viewType: string }
  | { type: 'removeMapping'; pattern: string; scope: MappingRow['scope'] };

const DEFAULT_VIEW_TYPE = 'default';

export class DefaultEditorSidebarProvider implements vscode.WebviewViewProvider {
  private view: vscode.WebviewView | undefined;

  constructor(private readonly context: vscode.ExtensionContext) {
    context.subscriptions.push(
      vscode.extensions.onDidChange(() => this.render()),
      vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration(settingKey())) this.render();
      }),
    );
  }

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _resolveContext: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void {
    this.view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, 'resources')],
    };

    webviewView.webview.onDidReceiveMessage(async (msg: WebviewMessage) => {
      try {
        if (msg.type === 'refresh') {
          await this.render();
        } else if (msg.type === 'openSetting') {
          await openSetting();
        } else if (msg.type === 'addMapping') {
          await this.handleAdd(msg.pattern, msg.viewType);
        } else if (msg.type === 'removeMapping') {
          await this.handleRemove(msg.pattern, msg.scope);
        }
      } catch (err) {
        vscode.window.showErrorMessage(String((err as Error)?.message ?? err));
      }
    });

    webviewView.onDidDispose(() => {
      if (this.view === webviewView) this.view = undefined;
    });

    void this.render();
  }

  private async handleAdd(pattern: string, viewType: string): Promise<void> {
    const trimmedPattern = (pattern ?? '').trim();
    if (!trimmedPattern) {
      vscode.window.showWarningMessage(vscode.l10n.t('Pattern is required.'));
      return;
    }
    if (!viewType) {
      vscode.window.showWarningMessage(vscode.l10n.t('Editor is required.'));
      return;
    }
    const target = await pickScope(vscode.l10n.t('Save to which scope?'));
    if (!target) return;
    await addMapping(trimmedPattern, viewType, target);
    vscode.window.setStatusBarMessage(
      vscode.l10n.t('Saved to {0}.', scopeLabel(target)),
      2000,
    );
  }

  private async handleRemove(pattern: string, currentScope: MappingRow['scope']): Promise<void> {
    if (currentScope === 'default') {
      return;
    }
    const target =
      currentScope === 'workspace'
        ? vscode.ConfigurationTarget.Workspace
        : vscode.ConfigurationTarget.Global;
    await removeMapping(pattern, target);
    vscode.window.setStatusBarMessage(vscode.l10n.t('Removed mapping {0}.', pattern), 2000);
  }

  private async render(): Promise<void> {
    if (!this.view) return;
    const [editors, mappings] = await Promise.all([loadCustomEditors(), Promise.resolve(readMappings())]);
    this.view.webview.html = buildHtml(this.view.webview, editors, mappings);
  }
}

function scopeLabel(target: vscode.ConfigurationTarget): string {
  if (target === vscode.ConfigurationTarget.Workspace) return vscode.l10n.t('Workspace settings');
  return vscode.l10n.t('User settings');
}

function buildHtml(
  webview: vscode.Webview,
  editors: CustomEditorEntry[],
  mappings: MappingRow[],
): string {
  const nonce = randomNonce();
  const csp = [
    `default-src 'none'`,
    `style-src ${webview.cspSource} 'unsafe-inline'`,
    `script-src 'nonce-${nonce}'`,
  ].join('; ');

  const dropdownOptions = buildEditorOptions(editors);

  const mappingsHtml = mappings.length
    ? mappings
        .map(row => {
          const editor = editors.find(e => e.viewType === row.viewType);
          const editorLabel = row.viewType === DEFAULT_VIEW_TYPE
            ? vscode.l10n.t('Built-in text editor (default)')
            : editor
            ? `${editor.displayName} — ${editor.viewType}`
            : row.viewType;
          const removable = row.scope !== 'default';
          return /* html */ `
            <div class="row" data-pattern="${escapeAttr(row.pattern)}" data-scope="${escapeAttr(row.scope)}">
              <div class="row-main">
                <div class="row-pattern">${escapeHtml(row.pattern)}</div>
                <div class="row-editor">${escapeHtml(editorLabel)}</div>
                <div class="row-scope">[${escapeHtml(row.scope)}]</div>
              </div>
              ${
                removable
                  ? `<button class="remove-btn" data-action="remove">${escapeHtml(vscode.l10n.t('Remove'))}</button>`
                  : ''
              }
            </div>
          `;
        })
        .join('')
    : `<div class="empty">${escapeHtml(vscode.l10n.t('No mappings configured. VSCode is using priority-based defaults.'))}</div>`;

  const editorListHtml = editors.length
    ? groupEditorsBySource(editors)
        .map(group => {
          const items = group.editors
            .map(e => /* html */ `
              <div class="editor-item">
                <div class="editor-row">
                  <span class="editor-name">${escapeHtml(e.displayName)}</span>
                  <span class="editor-viewtype">${escapeHtml(e.viewType)}</span>
                </div>
                <div class="editor-meta">
                  ${escapeHtml(vscode.l10n.t('Patterns:'))} ${escapeHtml(e.selectors.join(', ') || '—')}
                  &nbsp;·&nbsp;
                  ${escapeHtml(vscode.l10n.t('Priority: {0}', e.priority))}
                </div>
              </div>
            `)
            .join('');
          return /* html */ `
            <section class="editor-group">
              <h3>${escapeHtml(group.sourceDisplayName)} <span class="ext-id">${escapeHtml(group.sourceExtensionId)}</span></h3>
              ${items}
            </section>
          `;
        })
        .join('')
    : `<div class="empty">${escapeHtml(vscode.l10n.t('No installed custom editors found.'))}</div>`;

  return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="${csp}" />
  <style>
    * { box-sizing: border-box; }
    html, body {
      margin: 0; padding: 0;
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background: var(--vscode-sideBar-background);
    }
    .wrap { padding: 8px 10px 24px; }
    .toolbar { display: flex; justify-content: flex-end; gap: 4px; margin-bottom: 6px; }
    .icon-btn {
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
    .icon-btn:hover { background: var(--vscode-list-hoverBackground); opacity: 1; }
    h2 {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      opacity: 0.75;
      margin: 14px 0 4px;
      padding-bottom: 2px;
      border-bottom: 1px solid var(--vscode-panel-border, var(--vscode-widget-border));
    }
    .row {
      display: flex;
      align-items: flex-start;
      gap: 6px;
      padding: 4px 6px;
      border-radius: 3px;
      font-size: 12px;
    }
    .row:hover { background: var(--vscode-list-hoverBackground); }
    .row-main { flex: 1; min-width: 0; }
    .row-pattern {
      font-family: var(--vscode-editor-font-family);
      font-weight: 600;
      word-break: break-all;
    }
    .row-editor {
      font-size: 11px;
      opacity: 0.8;
      margin-top: 1px;
    }
    .row-scope {
      font-size: 10px;
      opacity: 0.5;
      font-family: var(--vscode-editor-font-family);
      margin-top: 1px;
    }
    .remove-btn {
      background: transparent;
      border: 1px solid var(--vscode-button-border, transparent);
      color: var(--vscode-errorForeground);
      padding: 2px 8px;
      font-size: 10px;
      font-family: inherit;
      cursor: pointer;
      border-radius: 3px;
      flex-shrink: 0;
    }
    .remove-btn:hover { background: var(--vscode-list-hoverBackground); }
    .empty {
      padding: 12px 6px;
      opacity: 0.55;
      font-size: 12px;
      font-style: italic;
    }
    .add-form {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin: 4px 6px;
    }
    .add-form input, .add-form select {
      width: 100%;
      padding: 4px 6px;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border, transparent);
      border-radius: 3px;
      font-family: inherit;
      font-size: 12px;
    }
    .add-form input:focus, .add-form select:focus { outline: 1px solid var(--vscode-focusBorder); }
    .add-form button {
      align-self: flex-end;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: 1px solid var(--vscode-button-background);
      padding: 4px 12px;
      font-family: inherit;
      font-size: 12px;
      cursor: pointer;
      border-radius: 3px;
    }
    .add-form button:hover { background: var(--vscode-button-hoverBackground); }
    .editor-group { margin: 6px 6px 10px; }
    .editor-group h3 {
      font-size: 11px;
      font-weight: 600;
      margin: 0 0 3px;
      opacity: 0.85;
      display: flex;
      align-items: baseline;
      gap: 6px;
    }
    .editor-group .ext-id {
      font-size: 9px;
      opacity: 0.45;
      font-family: var(--vscode-editor-font-family);
      font-weight: 400;
    }
    .editor-item { padding: 3px 0; }
    .editor-row {
      display: flex;
      align-items: baseline;
      gap: 8px;
      font-size: 11px;
    }
    .editor-name { font-weight: 500; }
    .editor-viewtype {
      font-family: var(--vscode-editor-font-family);
      font-size: 10px;
      opacity: 0.55;
    }
    .editor-meta {
      font-size: 10px;
      opacity: 0.6;
      font-family: var(--vscode-editor-font-family);
      margin-top: 1px;
      word-break: break-all;
    }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="toolbar">
      <button class="icon-btn" id="raw">${escapeHtml(vscode.l10n.t('Open the underlying setting'))}</button>
      <button class="icon-btn" id="refresh">${escapeHtml(vscode.l10n.t('Refresh'))}</button>
    </div>

    <h2>${escapeHtml(vscode.l10n.t('Current Mappings'))}</h2>
    <div id="mappings">${mappingsHtml}</div>

    <h2>${escapeHtml(vscode.l10n.t('Add Mapping'))}</h2>
    <div class="add-form">
      <input id="pattern" type="text" placeholder="${escapeAttr(vscode.l10n.t('Pattern (e.g. *.png, **/*.svg, .env)'))}" autocomplete="off" spellcheck="false" />
      <select id="viewType">
        <option value="">${escapeHtml(vscode.l10n.t('Editor'))}…</option>
        <option value="default">${escapeHtml(vscode.l10n.t('Built-in text editor (default)'))}</option>
        ${dropdownOptions}
      </select>
      <button id="add">${escapeHtml(vscode.l10n.t('Add'))}</button>
    </div>

    <h2>${escapeHtml(vscode.l10n.t('Installed Custom Editors'))}</h2>
    <div id="editors">${editorListHtml}</div>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();

    document.body.addEventListener('click', (e) => {
      const t = e.target;
      if (!(t instanceof HTMLElement)) return;
      if (t.id === 'refresh') { vscode.postMessage({ type: 'refresh' }); return; }
      if (t.id === 'raw') { vscode.postMessage({ type: 'openSetting' }); return; }
      if (t.id === 'add') {
        const pattern = document.getElementById('pattern').value;
        const viewType = document.getElementById('viewType').value;
        vscode.postMessage({ type: 'addMapping', pattern, viewType });
        return;
      }
      if (t.classList.contains('remove-btn')) {
        const row = t.closest('.row');
        if (!row) return;
        vscode.postMessage({
          type: 'removeMapping',
          pattern: row.dataset.pattern,
          scope: row.dataset.scope,
        });
      }
    });

    document.getElementById('pattern').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('add').click();
    });
  </script>
</body>
</html>`;
}

function buildEditorOptions(editors: CustomEditorEntry[]): string {
  return editors
    .map(
      e => /* html */ `<option value="${escapeAttr(e.viewType)}">${escapeHtml(
        `${e.displayName} — ${e.viewType}`,
      )}</option>`,
    )
    .join('');
}

function groupEditorsBySource(editors: CustomEditorEntry[]): Array<{
  sourceExtensionId: string;
  sourceDisplayName: string;
  editors: CustomEditorEntry[];
}> {
  const groups = new Map<string, { sourceDisplayName: string; editors: CustomEditorEntry[] }>();
  for (const e of editors) {
    const slot = groups.get(e.sourceExtensionId) ?? {
      sourceDisplayName: e.sourceDisplayName,
      editors: [],
    };
    slot.editors.push(e);
    groups.set(e.sourceExtensionId, slot);
  }
  return [...groups.entries()].map(([sourceExtensionId, slot]) => ({
    sourceExtensionId,
    sourceDisplayName: slot.sourceDisplayName,
    editors: slot.editors,
  }));
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
