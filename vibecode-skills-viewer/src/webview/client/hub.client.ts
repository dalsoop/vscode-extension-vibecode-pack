// Webview-side client. Compiled separately via tsconfig.client.json into
// dist/webview/client/hub.js and injected via <script src="..."> by HubProvider.
// No imports — runs as a plain script in a sandboxed browser context.
//
// All shared types come from the ambient `Contracts.*` namespace declared in
// src/contracts/*.d.ts (single source of truth shared with the extension).

interface ViewState {
  tabs: Contracts.Tab[];
  scopes: Contracts.Segment[];
  scope: Contracts.ScopeFilter;
  active: Contracts.TabId;
  data: Record<string, Contracts.Group[]>;
  filter: string;
  activeFolder: Contracts.ActiveFolder | null;
  dict: Record<string, string>;
}

declare function acquireVsCodeApi(): { postMessage(msg: any): void };

const vscode = acquireVsCodeApi();
const state: ViewState = {
  tabs: [],
  scopes: [],
  scope: 'all',
  active: 'skill',
  data: {},
  filter: '',
  activeFolder: null,
  dict: {}
};

function t(key: string, ...args: Array<string | number>): string {
  const raw = state.dict[key] ?? key;
  if (!args.length) return raw;
  return raw.replace(/\{(\d+)\}/g, (_m, i) => {
    const v = args[Number(i)];
    return v === undefined ? '' : String(v);
  });
}

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
    .map(
      tab => `<button class="tab ${tab.id === state.active ? 'active' : ''}" data-tab="${tab.id}">${tab.label}</button>`
    )
    .join('');
  document.querySelectorAll<HTMLButtonElement>('.tab').forEach(b => {
    b.onclick = () => {
      state.active = b.dataset.tab as Contracts.TabId;
      renderTabs();
      renderContent();
    };
  });
  const active = state.tabs.find(x => x.id === state.active);
  $('desc').textContent = active ? active.desc : '';
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
      ? `<span class="scope-hint" title="${esc(state.activeFolder.dir || '')}"><span class="codicon codicon-folder"></span> ${esc(state.activeFolder.label || t('hub.activeFolder.none'))}</span>`
      : '';
  $('scopes').innerHTML = html + hint;
  document.querySelectorAll<HTMLButtonElement>('#scopes .seg').forEach(b => {
    b.onclick = () => {
      if (b.classList.contains('disabled')) return;
      state.scope = b.dataset.scope as Contracts.ScopeFilter;
      renderScopes();
      vscode.postMessage({ type: 'setScope', scope: state.scope });
    };
  });
}

function findItem(id: string): Contracts.ItemPayload | null {
  for (const g of state.data[state.active] || []) {
    const it = g.items.find(x => x.id === id);
    if (it) return it;
  }
  return null;
}

function itemHtml(it: Contracts.ItemPayload): string {
  const acts = (it.actions || [])
    .map(a => {
      const ic = CODICONS[a] || 'symbol-method';
      const title = t(`hub.item.actionTitle.${a}`);
      return `<button class="act" data-a="${a}" data-id="${esc(it.id)}" title="${esc(title)}"><span class="codicon codicon-${ic}"></span></button>`;
    })
    .join('');
  const badge =
    it.badge === 'NEW'
      ? '<span class="badge new">NEW</span>'
      : it.badge === '★'
        ? '<span class="badge star">★</span>'
        : '';
  const score = it.score
    ? `<span class="score ${it.score.color}" title="${esc((it.score.issues || []).join('\n') || t('hub.score.noIssues'))}">${it.score.pct}</span>`
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
      state.scope === 'this' && !state.activeFolder ? t('hub.empty.noActiveFolder') : t('hub.empty.noItems');
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
  const m: Contracts.HubMsgFromExt = ev.data;
  if (m.type === 'init') {
    state.tabs = m.tabs;
    state.scopes = m.scopes;
    state.scope = m.scope;
    state.dict = m.i18n?.dict || {};
    renderTabs();
    renderContent();
  } else if (m.type === 'activeFolder') {
    state.activeFolder = { dir: m.dir, label: m.label };
    renderScopes();
  } else if (m.type === 'data') {
    state.data[m.tab] = m.items;
    renderContent();
  }
});
