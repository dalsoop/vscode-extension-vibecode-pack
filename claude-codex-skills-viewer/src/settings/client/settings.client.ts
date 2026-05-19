// Settings webview client. Compiled via tsconfig.settings-client.json.

interface CcSkillsConfig {
  includeWorkspace: boolean;
  includeGlobal: boolean;
  includeExtensions: boolean;
  tools: string;
  extraGlobalRoots: string[];
  extraWorkspaceRoots: string[];
  instructionFormat: 'ref' | 'compact' | 'full' | 'legacy';
  githubToken: string;
  autoSyncCanonicalOnStartup: boolean;
}
interface CanonicalSourceView {
  id: string;
  label: string;
  url: string;
  target: string;
  ref?: string;
  autoSync?: boolean;
  meta: { lastSync?: number; lastError?: string; lastHash?: string };
  lastAge?: string;
}
interface StorageInfo {
  historyRoot: string;
  historyExists: boolean;
  totalBytes: number;
  totalFiles: number;
  projects: number;
}
interface Payload {
  config: CcSkillsConfig;
  storage: StorageInfo;
  favoritesCount: number;
  extensionVersion: string;
  canonicalSources: CanonicalSourceView[];
}

declare function acquireVsCodeApi(): { postMessage(msg: any): void };
const vscode = acquireVsCodeApi();

let payload: Payload | null = null;

const $ = (id: string): HTMLElement => document.getElementById(id) as HTMLElement;
const esc = (s: any): string =>
  String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);
const ico = (n: string): string => `<span class="codicon codicon-${n}"></span>`;

function fmtBytes(n: number): string {
  if (n < 1024) return `${n}B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)}KB`;
  return `${(n / 1024 / 1024).toFixed(2)}MB`;
}

const TOOLS = ['all', 'claude', 'codex', 'copilot', 'cursor', 'gemini', 'windsurf', 'cline', 'agents'];
const FORMATS: Array<['ref' | 'compact' | 'full' | 'legacy', string]> = [
  ['ref', 'Table reference (compact + scannable)'],
  ['compact', 'Compact bullet list'],
  ['full', 'Full detail (description + when-to-use)'],
  ['legacy', 'Plain bullets']
];

function setKey(key: keyof CcSkillsConfig, value: any): void {
  vscode.postMessage({ type: 'set', key, value });
}

function switchEl(key: keyof CcSkillsConfig, label: string, hint: string): string {
  const v = !!(payload && payload.config[key]);
  return `<div class="row">
    <label class="switch">
      <input type="checkbox" data-key="${key}" ${v ? 'checked' : ''}>
      <span><span class="row-label">${esc(label)}</span><br><span class="row-hint">${esc(hint)}</span></span>
    </label>
  </div>`;
}

function listEl(key: 'extraGlobalRoots' | 'extraWorkspaceRoots', label: string, hint: string): string {
  const list = (payload?.config[key] || []) as string[];
  const rows = list
    .map(
      (p, i) =>
        `<div class="list-row">
      <input class="input" data-key="${key}" data-i="${i}" value="${esc(p)}">
      <button class="btn danger" data-action="remove" data-key="${key}" data-i="${i}">${ico('trash')}</button>
    </div>`
    )
    .join('');
  return `<div class="row">
    <span class="row-label">${esc(label)}</span>
    <span class="row-hint">${esc(hint)}</span>
    <div class="list">${rows || '<span class="row-hint" style="opacity:0.6">No entries</span>'}</div>
    <div class="actions">
      <button class="btn" data-action="add" data-key="${key}">${ico('add')} Add path</button>
    </div>
  </div>`;
}

function renderCanonical(): string {
  if (!payload) return '';
  const auto = payload.config.autoSyncCanonicalOnStartup;
  const sources = payload.canonicalSources;

  const sourceCards = sources.length
    ? sources
        .map(s => {
          const err = s.meta.lastError ? `<div class="cs-error">${ico('error')} ${esc(s.meta.lastError)}</div>` : '';
          const status = s.lastAge
            ? `<span class="cs-status ok">${ico('check')} ${esc(s.lastAge)}</span>`
            : `<span class="cs-status pending">${ico('history')} never pulled</span>`;
          return `<div class="cs-card" data-id="${esc(s.id)}">
          <div class="cs-head">
            <div class="cs-title">${esc(s.label)}</div>
            ${status}
          </div>
          <div class="cs-meta">
            <div><span class="cs-label">URL</span> <code class="path">${esc(s.url)}</code></div>
            <div><span class="cs-label">Target</span> <code class="path">${esc(s.target)}</code></div>
          </div>
          ${err}
          <div class="cs-actions">
            <label class="switch small">
              <input type="checkbox" data-cs-autosync data-id="${esc(s.id)}" ${s.autoSync ? 'checked' : ''}>
              <span>Auto-sync on startup</span>
            </label>
            <span style="flex:1"></span>
            <button class="btn" data-cs-act="open" data-target="${esc(s.target)}">${ico('go-to-file')} Open</button>
            <button class="btn" data-cs-act="pull" data-id="${esc(s.id)}">${ico('cloud-download')} Pull</button>
            <button class="btn danger" data-cs-act="remove" data-id="${esc(s.id)}">${ico('trash')}</button>
          </div>
        </div>`;
        })
        .join('')
    : '<div class="cs-empty">No canonical sources yet. Add one below — e.g., a GitLab raw URL pointing at AGENTS.md.</div>';

  return `<section>
    <h2>${ico('cloud-download')} Canonical Sync</h2>
    <div class="body">
      <div class="row">
        <label class="switch">
          <input type="checkbox" data-key="autoSyncCanonicalOnStartup" ${auto ? 'checked' : ''}>
          <span>
            <span class="row-label">Auto-sync on startup</span><br>
            <span class="row-hint">Pull all sources marked autoSync=true when the extension activates</span>
          </span>
        </label>
      </div>
      <div class="cs-list">${sourceCards}</div>
      <div class="cs-add">
        <input class="input" id="cs-add-url" placeholder="https://gitlab.ranode.net/workspace/rules/-/raw/main/AGENTS.md">
        <input class="input" id="cs-add-target" placeholder="AGENTS.md (workspace-relative, absolute, or ~/path)">
        <label class="switch small"><input type="checkbox" id="cs-add-autosync"><span>Auto-sync</span></label>
        <button class="btn primary" id="cs-add-btn">${ico('add')} Add source</button>
        <button class="btn" id="cs-pull-all-btn">${ico('sync')} Pull all</button>
      </div>
    </div>
  </section>`;
}

function render(): void {
  if (!payload) return;
  $('version').textContent = `v${payload.extensionVersion}`;
  const { config, storage, favoritesCount } = payload;

  $('main').innerHTML = `
    <section>
      <h2>${ico('search')} Sources</h2>
      <div class="body">
        ${switchEl('includeWorkspace', 'Scan workspace', 'Look for skills under <workspace>/.claude /.codex /.github etc.')}
        ${switchEl('includeGlobal', 'Scan global', 'Look for skills under ~/.claude /.codex /.copilot /.gemini /.agents')}
        ${switchEl('includeExtensions', 'Scan extension-bundled', 'Include skills shipped by other VSCode extensions')}
      </div>
    </section>

    <section>
      <h2>${ico('filter')} Tool Filter</h2>
      <div class="body">
        <div class="row">
          <span class="row-label">Show only one tool</span>
          <span class="row-hint">"all" shows skills from every AI tool</span>
          <div class="row-control">
            <select class="select" data-key="tools">
              ${TOOLS.map(t => `<option value="${t}" ${config.tools === t ? 'selected' : ''}>${t}</option>`).join('')}
            </select>
          </div>
        </div>
      </div>
    </section>

    <section>
      <h2>${ico('folder-opened')} Extra Skill Roots</h2>
      <div class="body">
        ${listEl('extraGlobalRoots', 'Global roots', 'Absolute paths to scan in addition to standard locations')}
        ${listEl('extraWorkspaceRoots', 'Workspace roots', 'Paths relative to the workspace (or absolute)')}
      </div>
    </section>

    <section>
      <h2>${ico('sync')} Instruction File Sync</h2>
      <div class="body">
        <div class="row">
          <span class="row-label">Block format</span>
          <span class="row-hint">Layout written into AGENTS.md / CLAUDE.md / .cursor/rules / etc.</span>
          <div class="radios" id="format-radios">
            ${FORMATS.map(
              ([v, l]) =>
                `<label class="radio ${config.instructionFormat === v ? 'active' : ''}"><input type="radio" name="fmt" value="${v}" ${config.instructionFormat === v ? 'checked' : ''}>${esc(l)}</label>`
            ).join('')}
          </div>
        </div>
      </div>
    </section>

    <section>
      <h2>${ico('github')} Remote Catalog</h2>
      <div class="body">
        <div class="row">
          <span class="row-label">GitHub token</span>
          <span class="row-hint">Personal access token for higher API rate limits (5000/hr vs 60/hr). Also reads GITHUB_TOKEN / GH_TOKEN env.</span>
          <div class="row-control">
            <input class="input" type="password" data-key="githubToken" value="${esc(config.githubToken)}" placeholder="ghp_xxxxxxxxxxxxxx">
          </div>
        </div>
      </div>
    </section>

    ${renderCanonical()}

    <section>
      <h2>${ico('database')} Storage</h2>
      <div class="body">
        <dl class="info-grid">
          <dt>Snapshot history</dt>
          <dd><code class="path">${esc(storage.historyRoot)}</code></dd>
          <dt>Size</dt>
          <dd>${fmtBytes(storage.totalBytes)} · ${storage.totalFiles} files · ${storage.projects} projects</dd>
          <dt>Favorites</dt>
          <dd>${favoritesCount} pinned</dd>
        </dl>
        <div class="actions">
          <button class="btn" data-action="open-history-folder">${ico('folder-opened')} Open folder</button>
          <button class="btn danger" data-action="clear-history" ${storage.historyExists ? '' : 'disabled'}>${ico('trash')} Clear all history</button>
          <button class="btn danger" data-action="clear-favorites" ${favoritesCount === 0 ? 'disabled' : ''}>${ico('star-empty')} Clear favorites</button>
        </div>
      </div>
    </section>

    <section>
      <h2>${ico('info')} About</h2>
      <div class="body">
        <dl class="info-grid">
          <dt>Version</dt>
          <dd>${esc(payload.extensionVersion)}</dd>
          <dt>Settings storage</dt>
          <dd>VSCode global settings (synced via Settings Sync)</dd>
        </dl>
        <div class="actions">
          <button class="btn" data-action="open-vscode-settings">${ico('gear')} Open in VSCode settings</button>
          <button class="btn" data-action="reload-window">${ico('refresh')} Reload window</button>
        </div>
      </div>
    </section>`;

  bind();
}

function bind(): void {
  // boolean switches
  document.querySelectorAll<HTMLInputElement>('input[type="checkbox"][data-key]').forEach(el => {
    el.onchange = () => setKey(el.dataset.key as any, el.checked);
  });

  // canonical autoSync toggle per source
  document.querySelectorAll<HTMLInputElement>('input[data-cs-autosync]').forEach(el => {
    el.onchange = () =>
      vscode.postMessage({ type: 'canonical-toggle-autosync', id: el.dataset.id, autoSync: el.checked });
  });
  // canonical per-source action buttons
  document.querySelectorAll<HTMLButtonElement>('[data-cs-act]').forEach(btn => {
    btn.onclick = () => {
      const act = btn.dataset.csAct!;
      if (act === 'remove') {
        if (!confirm('Remove this canonical source? Target file stays — only the sync entry is removed.')) return;
        vscode.postMessage({ type: 'canonical-remove', id: btn.dataset.id });
      } else if (act === 'pull') {
        vscode.postMessage({ type: 'canonical-pull', id: btn.dataset.id });
      } else if (act === 'open') {
        vscode.postMessage({ type: 'canonical-open-target', target: btn.dataset.target });
      }
    };
  });
  // canonical add form
  const addBtn = document.getElementById('cs-add-btn') as HTMLButtonElement | null;
  if (addBtn)
    addBtn.onclick = () => {
      const url = (document.getElementById('cs-add-url') as HTMLInputElement)?.value.trim();
      const target = (document.getElementById('cs-add-target') as HTMLInputElement)?.value.trim();
      const autoSync = (document.getElementById('cs-add-autosync') as HTMLInputElement)?.checked;
      if (!url || !target) {
        alert('URL and target are required.');
        return;
      }
      vscode.postMessage({ type: 'canonical-add', url, target, autoSync });
    };
  const pullAllBtn = document.getElementById('cs-pull-all-btn') as HTMLButtonElement | null;
  if (pullAllBtn) pullAllBtn.onclick = () => vscode.postMessage({ type: 'canonical-pull-all' });

  // tools select
  document.querySelectorAll<HTMLSelectElement>('select[data-key="tools"]').forEach(el => {
    el.onchange = () => setKey('tools', el.value);
  });
  // format radios
  document.querySelectorAll<HTMLInputElement>('input[name="fmt"]').forEach(el => {
    el.onchange = () => setKey('instructionFormat', el.value);
  });
  // github token
  document.querySelectorAll<HTMLInputElement>('input[type="password"][data-key="githubToken"]').forEach(el => {
    el.onblur = () => setKey('githubToken', el.value);
  });
  // extra roots list editors
  document.querySelectorAll<HTMLInputElement>('input.input[data-key^="extra"]').forEach(el => {
    el.onblur = () => {
      const key = el.dataset.key as 'extraGlobalRoots' | 'extraWorkspaceRoots';
      const i = parseInt(el.dataset.i || '0', 10);
      const list = ((payload?.config[key] || []) as string[]).slice();
      list[i] = el.value;
      setKey(
        key,
        list.filter(x => x.trim())
      );
    };
  });
  // action buttons
  document.querySelectorAll<HTMLButtonElement>('[data-action]').forEach(btn => {
    btn.onclick = () => {
      const a = btn.dataset.action!;
      if (a === 'remove') {
        const key = btn.dataset.key as 'extraGlobalRoots' | 'extraWorkspaceRoots';
        const i = parseInt(btn.dataset.i || '0', 10);
        const list = ((payload?.config[key] || []) as string[]).slice();
        list.splice(i, 1);
        setKey(key, list);
      } else if (a === 'add') {
        const key = btn.dataset.key as 'extraGlobalRoots' | 'extraWorkspaceRoots';
        const v = prompt('Path to add (absolute):');
        if (!v) return;
        const list = ((payload?.config[key] || []) as string[]).slice();
        list.push(v.trim());
        setKey(key, list);
      } else {
        vscode.postMessage({ type: a });
      }
    };
  });
}

window.addEventListener('message', ev => {
  const m = ev.data;
  if (m.type === 'payload') {
    payload = m.payload;
    render();
  } else if (m.type === 'error') {
    alert(`Settings error: ${m.message}`);
  }
});

vscode.postMessage({ type: 'ready' });
