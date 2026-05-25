// Webview-side client. Compiled separately via tsconfig.client.json into
// dist/webview/client/hub.js and injected via <script src="..."> by HubProvider.
// No imports — runs as a plain script in a sandboxed browser context.
//
// Types here MUST stay in sync with src/types.ts MsgFromExt / MsgFromView /
// ItemPayload / Group / Tab / Segment. Keep duplicated locally so this file
// is fully standalone for separate compilation.

interface Tab {
  id: string;
  label: string;
  desc: string;
}
interface Segment {
  id: string;
  label: string;
}
interface ScoreInfo {
  pct: number;
  grade: string;
  color: string;
  issues?: string[];
}
interface Item {
  id: string;
  title: string;
  subtitle?: string;
  meta?: string;
  badge?: string;
  path?: string;
  mdPath?: string | null;
  tool?: string;
  score?: ScoreInfo;
  actions?: string[];
}
interface Group {
  title: string;
  items: Item[];
}
interface ActiveFolder {
  dir: string | null;
  label: string | null;
}

type MsgFromExt =
  | { type: 'init'; tabs: Tab[]; scopes: Segment[]; tools: Segment[]; scope: string; tool: string }
  | { type: 'activeFolder'; dir: string | null; label: string | null }
  | { type: 'data'; tab: string; items: Group[] };

interface ViewState {
  tabs: Tab[];
  scopes: Segment[];
  tools: Segment[];
  scope: string;
  tool: string;
  active: string;
  data: Record<string, Group[]>;
  filter: string;
  activeFolder: ActiveFolder | null;
}

declare function acquireVsCodeApi(): { postMessage(msg: any): void };

const vscode = acquireVsCodeApi();
const state: ViewState = {
  tabs: [],
  scopes: [],
  tools: [],
  scope: 'all',
  tool: 'all',
  active: 'skill',
  data: {},
  filter: '',
  activeFolder: null
};

const $ = (id: string): HTMLElement => document.getElementById(id) as HTMLElement;
const esc = (s: any): string =>
  String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);

// Action button glyphs: codicon class names (see @vscode/codicons).
const CODICONS: Record<string, string> = {
  open: 'go-to-file',
  preview: 'preview',
  finder: 'folder-opened',
  fav: 'star-full',
  sync: 'sync',
  github: 'github',
  create: 'add'
};

function renderTabs(): void {
  $('tabs').innerHTML = state.tabs
    .map(t => `<button class="tab ${t.id === state.active ? 'active' : ''}" data-tab="${t.id}">${t.label}</button>`)
    .join('');
  document.querySelectorAll<HTMLButtonElement>('.tab').forEach(b => {
    b.onclick = () => {
      state.active = b.dataset.tab!;
      renderTabs();
      renderContent();
    };
  });
  const t = state.tabs.find(x => x.id === state.active);
  $('desc').textContent = t ? t.desc : '';
}

function renderTools(): void {
  $('tools').innerHTML = state.tools
    .map(t => `<button class="seg ${t.id === state.tool ? 'active' : ''}" data-tool="${t.id}">${t.label}</button>`)
    .join('');
  document.querySelectorAll<HTMLButtonElement>('#tools .seg').forEach(b => {
    b.onclick = () => {
      state.tool = b.dataset.tool!;
      renderTools();
      vscode.postMessage({ type: 'setTool', tool: state.tool });
    };
  });
}

function renderScopes(): void {
  const browseOnly = state.active === 'browse';
  const html = state.scopes
    .map(s => {
      const disabled = browseOnly && s.id !== 'all';
      const cls = ['seg', s.id === state.scope ? 'active' : '', disabled ? 'disabled' : ''].filter(Boolean).join(' ');
      return `<button class="${cls}" data-scope="${s.id}"${disabled ? ' disabled' : ''}>${s.label}</button>`;
    })
    .join('');
  const hint =
    state.scope === 'this' && state.activeFolder
      ? `<span class="scope-hint" title="${esc(state.activeFolder.dir || '')}"><span class="codicon codicon-folder"></span> ${esc(state.activeFolder.label || '(no folder)')}</span>`
      : '';
  $('scopes').innerHTML = html + hint;
  document.querySelectorAll<HTMLButtonElement>('#scopes .seg').forEach(b => {
    b.onclick = () => {
      if (b.classList.contains('disabled')) return;
      state.scope = b.dataset.scope!;
      renderScopes();
      vscode.postMessage({ type: 'setScope', scope: state.scope });
    };
  });
}

function findItem(id: string): Item | null {
  for (const g of state.data[state.active] || []) {
    const it = g.items.find(x => x.id === id);
    if (it) return it;
  }
  return null;
}

function itemHtml(it: Item): string {
  const acts = (it.actions || [])
    .map(a => {
      const ic = CODICONS[a] || 'symbol-method';
      return `<button class="act" data-a="${a}" data-id="${esc(it.id)}" title="${a}"><span class="codicon codicon-${ic}"></span></button>`;
    })
    .join('');
  const badge =
    it.badge === 'NEW'
      ? '<span class="badge new">NEW</span>'
      : it.badge === '★'
        ? '<span class="badge star">★</span>'
        : '';
  const score = it.score
    ? `<span class="score ${it.score.color}" title="${esc((it.score.issues || []).join('\n') || 'No issues')}">${it.score.pct}</span>`
    : '';
  return `<div class="item" data-id="${esc(it.id)}">
    <div class="item-body">
      <div class="item-title">${badge}${score}<span>${esc(it.title)}</span></div>
      ${it.subtitle ? `<div class="item-subtitle">${esc(it.subtitle)}</div>` : ''}
      ${it.meta ? `<div class="item-meta">${esc(it.meta)}</div>` : ''}
    </div>
    <div class="actions">${acts}</div>
  </div>`;
}

function renderContent(): void {
  renderScopes();
  const groups = state.data[state.active] || [];
  const f = state.filter.toLowerCase();
  const parts: string[] = [];
  let total = 0;
  for (const g of groups) {
    const items = g.items.filter(
      it => !f || (it.title + ' ' + (it.subtitle || '') + ' ' + (it.meta || '')).toLowerCase().includes(f)
    );
    if (!items.length) continue;
    total += items.length;
    parts.push(
      `<div class="group"><div class="group-title">${esc(g.title)} <span style="opacity:0.6">(${items.length})</span></div>`
    );
    for (const it of items) parts.push(itemHtml(it));
    parts.push('</div>');
  }
  if (!total) {
    const hint =
      state.scope === 'this' && !state.activeFolder
        ? 'No active editor — open a file to use This Folder scope.'
        : 'No items';
    parts.push(`<div class="empty">${esc(hint)}</div>`);
  }
  $('content').innerHTML = parts.join('');

  document.querySelectorAll<HTMLElement>('.item').forEach(el => {
    el.onclick = e => {
      if ((e.target as Element).closest('.act')) return;
      const item = findItem(el.dataset.id!);
      if (!item) return;
      const preferred = state.active === 'skill' ? 'preview' : 'open';
      vscode.postMessage({ type: 'action', action: preferred, payload: item });
    };
  });
  document.querySelectorAll<HTMLButtonElement>('.act').forEach(btn => {
    btn.onclick = e => {
      e.stopPropagation();
      const item = findItem(btn.dataset.id!);
      if (item) vscode.postMessage({ type: 'action', action: btn.dataset.a, payload: item });
    };
  });
}

(document.getElementById('q') as HTMLInputElement).oninput = e => {
  state.filter = (e.target as HTMLInputElement).value;
  renderContent();
};
$('refresh').onclick = () => vscode.postMessage({ type: 'refresh' });
$('add').onclick = () => vscode.postMessage({ type: 'createSkill' });

window.addEventListener('message', ev => {
  const m: MsgFromExt = ev.data;
  if (m.type === 'init') {
    state.tabs = m.tabs;
    state.scopes = m.scopes;
    state.tools = m.tools;
    state.scope = m.scope;
    state.tool = m.tool;
    renderTabs();
    renderTools();
    renderContent();
  } else if (m.type === 'activeFolder') {
    state.activeFolder = { dir: m.dir, label: m.label };
    renderScopes();
  } else if (m.type === 'data') {
    state.data[m.tab] = m.items;
    renderContent();
  }
});
