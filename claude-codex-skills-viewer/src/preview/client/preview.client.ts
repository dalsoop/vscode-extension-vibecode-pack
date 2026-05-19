// Interactive preview client. Compiled via tsconfig.preview-client.json.

interface SectionRule {
  id: string;
  pass: boolean;
  weight: number;
  message: string;
}
interface SectionScore {
  pct: number;
  earned: number;
  total: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  color: 'green' | 'lime' | 'yellow' | 'orange' | 'red';
  rules: SectionRule[];
  issues: string[];
}
interface Section {
  id: string;
  canonical?: string;
  kind: 'frontmatter' | 'title' | 'heading';
  level?: number;
  heading?: string;
  raw: string;
  body: string;
  rendered: string;
  score: SectionScore;
}
interface AuxFile {
  name: string;
  abs: string;
  size: number;
  age: string;
}
interface Meta {
  name: string;
  description?: string;
  source: { label: string; scope: string; readOnly: boolean };
  abs: string;
  categories: string[];
  totalScore: SectionScore;
  lines: number;
  chars: number;
  ageDays: number;
  frontmatterError?: { message: string; line?: number; column?: number; snippet?: string } | null;
  showScoreBreakdown: boolean;
  mirrors: Array<{ source: 'group' | 'skill-by-name'; groupLabel?: string; targets: string[] }>;
}
interface TocEntry {
  id: string;
  label: string;
  level: number;
  score: number;
}
interface Payload {
  meta: Meta;
  sections: Section[];
  aux: AuxFile[];
  toc: TocEntry[];
}

declare function acquireVsCodeApi(): { postMessage(msg: any): void };
const vscode = acquireVsCodeApi();

let payload: Payload | null = null;
const editing = new Set<string>();
const collapsedRules = new Set<string>(); // rules visible by default; user can collapse
const confirmingDelete = new Set<string>();
let externalDirty = false;

const $ = (id: string): HTMLElement => document.getElementById(id) as HTMLElement;
const esc = (s: any): string =>
  String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);

function ico(name: string): string {
  return `<span class="codicon codicon-${name}"></span>`;
}

const FIX_BY_RULE: Record<string, string> = {
  'no-emoji-desc': 'strip-emoji',
  'no-emoji-title': 'strip-emoji',
  'no-emoji-intro': 'strip-emoji',
  'no-emoji': 'strip-emoji',
  'no-emoji-body': 'strip-emoji',
  'desc-length': 'trim-desc-200'
};

function readOnly(): boolean {
  return !!payload?.meta.source.readOnly;
}

function askMirror(): boolean {
  const mirrors = payload?.meta.mirrors || [];
  const count = mirrors.reduce((a, m) => a + m.targets.length, 0);
  if (count === 0) return false;
  const summary = mirrors
    .map(m => {
      const label = m.source === 'group' ? m.groupLabel || 'Group' : 'Skills sharing this name';
      return `[${label}]\n  ` + m.targets.join('\n  ');
    })
    .join('\n\n');
  return confirm(`Apply the same full-file content to ${count} mirror target(s)?\n\n${summary}\n\nOK = write to all mirrors. Cancel = save only this file.`);
}

function renderHeader(): void {
  if (!payload) return;
  const { meta } = payload;
  $('title').textContent = meta.name;
  const roBadge = meta.source.readOnly
    ? '<span class="badge ro" title="Bundled by extension — cannot edit">read-only</span>'
    : '';
  const extBadge = externalDirty ? '<span class="badge warn">⚠ external change</span>' : '';
  const mirrorCount = (meta.mirrors || []).reduce((a, m) => a + m.targets.length, 0);
  const mirrorBadge = mirrorCount
    ? `<span class="badge mirror" title="${esc(
        (meta.mirrors || [])
          .map(m => `${m.source === 'group' ? m.groupLabel || 'Group' : 'Skill by name'}:\n  ${m.targets.join('\n  ')}`)
          .join('\n\n')
      )}">${ico('link')} mirrored ×${mirrorCount}</span>`
    : '';
  $('meta').innerHTML = [
    `<span class="badge">${esc(meta.source.label)}</span>`,
    `<span class="badge">${esc(meta.source.scope)}</span>`,
    roBadge,
    extBadge,
    mirrorBadge,
    ...meta.categories.map(c => `<span class="badge">${esc(c)}</span>`),
    `<span class="score ${meta.totalScore.color}" title="${esc(meta.totalScore.issues.join('\n') || 'No issues')}">${meta.totalScore.pct}/100 ${meta.totalScore.grade}</span>`,
    `<span style="opacity:0.7">${meta.lines} lines · ${(meta.chars / 1024).toFixed(1)}KB · ${Math.floor(meta.ageDays)}d old</span>`
  ].join('');
  const showScore = meta.showScoreBreakdown;
  $('toolbar').innerHTML = [
    `<button class="tbtn" data-act="open">${ico('go-to-file')} Open</button>`,
    `<button class="tbtn" data-act="copy-md">${ico('copy')} Copy MD</button>`,
    `<button class="tbtn" data-act="copy-path">${ico('files')} Copy Path</button>`,
    `<button class="tbtn" data-act="finder">${ico('folder-opened')} Finder</button>`,
    `<button class="tbtn" data-act="terminal">${ico('terminal')} Terminal</button>`,
    `<button class="tbtn ${showScore ? 'active' : ''}" data-act="toggle-score" title="Toggle score breakdowns (sticky)">${ico(showScore ? 'eye' : 'eye-closed')} ${showScore ? 'Hide scores' : 'Show scores'}</button>`,
    `<button class="tbtn" data-act="refresh">${ico('refresh')} Refresh</button>`
  ].join('');
  $('toolbar')
    .querySelectorAll<HTMLButtonElement>('.tbtn')
    .forEach(b => {
      b.onclick = () => {
        const a = b.dataset.act;
        if (a === 'toggle-score') {
          vscode.postMessage({ type: 'toggle-score-breakdown', value: !showScore });
        } else {
          vscode.postMessage({ type: a });
        }
      };
    });
}

function parseFmYaml(body: string): { name?: string; description?: string; categories?: string[] } {
  const out: any = {};
  for (const line of body.split('\n')) {
    const m = line.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
    if (!m) continue;
    let v: any = m[2].trim().replace(/^["']|["']$/g, '');
    if (typeof v === 'string' && v.startsWith('[') && v.endsWith(']')) {
      v = v
        .slice(1, -1)
        .split(',')
        .map((s: string) => s.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean);
    }
    out[m[1]] = v;
  }
  return out;
}

function buildFmYaml(fields: { name: string; description: string; categories: string[]; extra: string }): string {
  const lines = ['---'];
  if (fields.name) lines.push(`name: ${fields.name}`);
  if (fields.description) lines.push(`description: ${fields.description}`);
  if (fields.categories.length) lines.push(`categories: [${fields.categories.join(', ')}]`);
  if (fields.extra.trim()) lines.push(fields.extra.trim());
  lines.push('---');
  return lines.join('\n');
}

function renderFrontmatterForm(s: Section): string {
  const body = s.raw.replace(/^---\n/, '').replace(/\n---$/, '');
  const fm = parseFmYaml(body);
  const knownKeys = new Set(['name', 'description', 'categories']);
  const extra = body
    .split('\n')
    .filter(l => {
      const k = l.match(/^([A-Za-z_][\w-]*)\s*:/);
      return !k || !knownKeys.has(k[1]);
    })
    .join('\n');
  const descLen = (fm.description || '').length;
  const descClass = descLen > 200 ? 'over' : descLen > 150 ? 'near' : '';
  return `
    <div class="fm-form" data-id="${esc(s.id)}">
      <label class="fm-row">
        <span class="fm-label">name</span>
        <input class="fm-input" data-field="name" value="${esc(fm.name || '')}" placeholder="my-skill-name">
      </label>
      <label class="fm-row">
        <span class="fm-label">description <span class="fm-counter ${descClass}">${descLen}/200</span></span>
        <textarea class="fm-textarea" data-field="description" rows="3" placeholder="One-sentence trigger description">${esc(fm.description || '')}</textarea>
      </label>
      <label class="fm-row">
        <span class="fm-label">categories <span class="fm-hint">comma-separated</span></span>
        <input class="fm-input" data-field="categories" value="${esc((fm.categories || []).join(', '))}" placeholder="dev, testing, ai">
      </label>
      ${extra ? `<label class="fm-row"><span class="fm-label">other YAML</span><textarea class="fm-textarea" data-field="extra" rows="3">${esc(extra)}</textarea></label>` : ''}
      <div class="edit-row">
        <button class="tbtn" data-sect-act="cancel" data-id="${esc(s.id)}">Cancel</button>
        <button class="tbtn primary" data-sect-act="save-fm" data-id="${esc(s.id)}">${ico('save')} Save</button>
      </div>
    </div>`;
}

function renderSection(s: Section): string {
  const isEditing = editing.has(s.id);
  const globallyHidden = payload && !payload.meta.showScoreBreakdown;
  const rulesCollapsed = globallyHidden || collapsedRules.has(s.id);
  const kind = s.canonical || s.kind;
  const label = s.heading || (s.canonical === 'frontmatter' ? 'Frontmatter' : 'Section');
  const ro = readOnly();
  const lowScore = s.score.pct < 60;
  const fails = s.score.rules.filter(r => !r.pass);
  const passes = s.score.rules.filter(r => r.pass);

  const editButtons = ro
    ? `<button class="sa" disabled title="Read-only">${ico('lock')}</button>`
    : `<button class="sa" data-sect-act="${isEditing ? 'cancel' : 'edit'}" data-id="${esc(s.id)}" title="${isEditing ? 'Cancel' : 'Edit'}">${ico(isEditing ? 'close' : 'edit')}</button>`;

  const isConfirming = confirmingDelete.has(s.id);
  const deleteButton = ro
    ? ''
    : isConfirming
      ? `<button class="sa danger active" data-sect-act="cancel-delete" data-id="${esc(s.id)}" title="Cancel delete">${ico('close')}</button>`
      : `<button class="sa danger" data-sect-act="delete-section" data-id="${esc(s.id)}" title="Delete section">${ico('trash')}</button>`;

  const head = `
    <div class="section-head">
      <span class="section-title">
        <span class="kind-pill">${esc(kind)}</span>
        ${esc(label)}
        <span class="score ${s.score.color}" title="${esc(s.score.issues.join('\n') || 'All checks pass')}">${s.score.pct}/100</span>
        ${fails.length ? `<span class="fail-count">${fails.length} issue${fails.length > 1 ? 's' : ''}</span>` : '<span class="pass-tag">✓ clean</span>'}
      </span>
      <span class="section-actions">
        <button class="sa" data-sect-act="toggle-rules" data-id="${esc(s.id)}" title="${rulesCollapsed ? 'Show breakdown' : 'Hide breakdown'}">${ico(rulesCollapsed ? 'chevron-down' : 'chevron-up')}</button>
        ${editButtons}
        ${deleteButton}
      </span>
    </div>`;

  // Score breakdown — ALWAYS visible (failed rules first, then passed in muted style)
  const renderRule = (r: SectionRule): string => {
    const fix = !r.pass && !ro && FIX_BY_RULE[r.id];
    const fixBtn = fix
      ? `<button class="fix-btn" data-sect-act="quick-fix" data-id="${esc(s.id)}" data-fix="${esc(fix)}" title="Apply fix">${ico('wand')} Fix</button>`
      : '';
    return `<li class="rule-li ${r.pass ? 'rule-pass' : 'rule-fail'}">
      <span class="mark">${r.pass ? '✓' : '✗'}</span>
      <span class="rule-msg">${esc(r.message)}</span>
      <span class="rule-pts">${r.pass ? '+' : '−'}${r.weight}pt</span>
      ${fixBtn}
    </li>`;
  };

  const rulesHtml = rulesCollapsed
    ? ''
    : `<div class="rules-block">
        ${
          fails.length
            ? `<div class="rules-group">
              <div class="rules-group-title">Lost points (${fails.reduce((a, r) => a + r.weight, 0)}pt)</div>
              <ul class="rules">${fails.map(renderRule).join('')}</ul>
            </div>`
            : ''
        }
        ${
          passes.length
            ? `<div class="rules-group muted">
              <div class="rules-group-title">Earned (${passes.reduce((a, r) => a + r.weight, 0)}pt)</div>
              <ul class="rules">${passes.map(renderRule).join('')}</ul>
            </div>`
            : ''
        }
      </div>`;

  let bodyHtml = '';
  if (confirmingDelete.has(s.id)) {
    bodyHtml = `<div class="delete-confirm">
        <div class="dc-icon">${ico('warning')}</div>
        <div class="dc-text">
          <div class="dc-title">Delete this section?</div>
          <div class="dc-desc">The section header and its body will be removed from <code>SKILL.md</code>. This cannot be undone from inside the extension — make sure your editor / VCS has it.</div>
          <div class="dc-target">${esc(s.canonical || s.kind)} · ${esc(s.heading || s.id)}</div>
        </div>
        <div class="dc-actions">
          <button class="tbtn" data-sect-act="cancel-delete" data-id="${esc(s.id)}">Cancel</button>
          <button class="tbtn danger" data-sect-act="confirm-delete" data-id="${esc(s.id)}">${ico('trash')} Delete</button>
        </div>
      </div>`;
  } else if (isEditing && s.canonical === 'frontmatter') {
    bodyHtml = renderFrontmatterForm(s);
  } else if (isEditing) {
    bodyHtml = `<textarea class="editor" data-id="${esc(s.id)}">${esc(s.raw)}</textarea>
       <div class="edit-row">
         <button class="tbtn" data-sect-act="cancel" data-id="${esc(s.id)}">Cancel</button>
         <button class="tbtn primary" data-sect-act="save" data-id="${esc(s.id)}">${ico('save')} Save</button>
       </div>`;
  } else {
    bodyHtml = `<div class="rendered">${s.rendered}</div>`;
  }

  const classes = ['section', lowScore ? 'low-score' : '', isConfirming ? 'confirming' : ''].filter(Boolean).join(' ');
  return `<section class="${classes}" data-section="${esc(s.id)}" id="sect-${esc(s.id)}">
    ${head}
    <div class="section-body">
      ${isConfirming ? '' : rulesHtml}
      ${bodyHtml}
    </div>
  </section>`;
}

function renderAux(): string {
  if (!payload || !payload.aux.length) return '';
  return `<section class="section">
    <div class="section-head"><span class="section-title"><span class="kind-pill">aux</span> Auxiliary Files</span></div>
    <div class="section-body">
      <div class="aux-files">
        ${payload.aux
          .map(
            a =>
              `<span class="aux-file" data-aux="${esc(a.abs)}" title="${esc(a.abs)}">${ico('file')} ${esc(a.name)} <span style="opacity:0.6">(${(a.size / 1024).toFixed(1)}KB · ${esc(a.age)})</span></span>`
          )
          .join('')}
      </div>
    </div>
  </section>`;
}

function injectCodeCopyButtons(): void {
  $('main')
    .querySelectorAll<HTMLPreElement>('pre')
    .forEach(pre => {
      if (pre.querySelector('.code-copy')) return;
      const btn = document.createElement('button');
      btn.className = 'code-copy';
      btn.innerHTML = ico('copy');
      btn.title = 'Copy code';
      btn.onclick = () => {
        const code = pre.querySelector('code')?.textContent || pre.textContent || '';
        navigator.clipboard.writeText(code);
        btn.classList.add('copied');
        setTimeout(() => btn.classList.remove('copied'), 1000);
      };
      pre.style.position = 'relative';
      pre.appendChild(btn);
    });
}

function bindCounters(): void {
  $('main')
    .querySelectorAll<HTMLTextAreaElement>('.fm-textarea[data-field="description"]')
    .forEach(ta => {
      ta.oninput = () => {
        const counter = ta.parentElement?.querySelector<HTMLElement>('.fm-counter');
        if (!counter) return;
        const len = ta.value.length;
        counter.textContent = `${len}/200`;
        counter.classList.remove('over', 'near');
        if (len > 200) counter.classList.add('over');
        else if (len > 150) counter.classList.add('near');
      };
    });
}

function renderToc(): string {
  if (!payload || payload.toc.length === 0) return '';
  const colorFor = (n: number): string =>
    n >= 90 ? '#6bd58a' : n >= 75 ? '#b7df4d' : n >= 60 ? '#f4d03f' : n >= 40 ? '#ff9d3a' : '#ff6363';
  return `<aside id="toc">
    <div class="toc-title">Sections</div>
    ${payload.toc
      .map(
        t => `
      <a class="toc-item" href="#sect-${esc(t.id)}" data-jump="${esc(t.id)}">
        <span class="toc-dot" style="background:${colorFor(t.score)}"></span>
        <span class="toc-label">${esc(t.label)}</span>
        <span class="toc-score" style="color:${colorFor(t.score)}">${t.score}</span>
      </a>`
      )
      .join('')}
  </aside>`;
}

function renderYamlError(): string {
  const e = payload?.meta.frontmatterError;
  if (!e) return '';
  const where = e.line ? `line ${e.line}${e.column ? `:${e.column}` : ''}` : '';
  const openBtn = e.line
    ? `<button class="tbtn" data-yaml-act="open-at-line" data-line="${e.line}" data-column="${e.column || 1}">${ico('go-to-file')} Open at ${where}</button>`
    : '';
  return `<div class="yaml-error">
    <div class="ye-head">
      <span class="ye-icon">${ico('error')}</span>
      <strong>Invalid frontmatter YAML — tools like Codex / Claude Code will skip this skill.</strong>
    </div>
    <div class="ye-msg">${esc(e.message)} ${where ? `<code>(${where})</code>` : ''}</div>
    ${e.snippet ? `<pre class="ye-snippet">${esc(e.snippet)}</pre>` : ''}
    <div class="ye-hint">Common fix: wrap values containing <code>:</code>, <code>"</code>, or special chars in double quotes.</div>
    <div class="ye-actions">
      <button class="tbtn primary" data-yaml-act="autofix">${ico('wand')} Try auto-fix</button>
      ${openBtn}
    </div>
  </div>`;
}

function render(): void {
  if (!payload) return;
  renderHeader();
  const main = $('main');
  main.innerHTML = `
    ${renderYamlError()}
    <div class="layout">
      <div class="content">
        ${[...payload.sections.map(renderSection), renderAux()].join('')}
      </div>
      ${renderToc()}
    </div>`;

  main.querySelectorAll<HTMLButtonElement>('[data-sect-act]').forEach(btn => {
    btn.onclick = () => handleSectionAction(btn.dataset.sectAct!, btn.dataset.id!, btn.dataset.fix);
  });
  main.querySelectorAll<HTMLElement>('[data-aux]').forEach(el => {
    el.onclick = () => vscode.postMessage({ type: 'open-file', path: el.dataset.aux });
  });
  main.querySelectorAll<HTMLButtonElement>('[data-yaml-act]').forEach(btn => {
    btn.onclick = () => {
      const a = btn.dataset.yamlAct!;
      if (a === 'autofix') {
        if (readOnly()) {
          alert('This file is read-only.');
          return;
        }
        if (
          confirm(
            'Try to auto-fix frontmatter by quoting risky values?\n\nThis will overwrite the file in place — undo via your editor / VCS if needed.'
          )
        ) {
          vscode.postMessage({ type: 'autofix-frontmatter' });
        }
      } else if (a === 'open-at-line') {
        vscode.postMessage({
          type: 'open-at-line',
          line: parseInt(btn.dataset.line || '1', 10),
          column: parseInt(btn.dataset.column || '1', 10)
        });
      }
    };
  });

  injectCodeCopyButtons();
  bindCounters();

  main.querySelectorAll<HTMLAnchorElement>('[data-jump]').forEach(a => {
    a.onclick = e => {
      e.preventDefault();
      const id = a.dataset.jump!;
      const target = document.getElementById(`sect-${id}`);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
  });
}

function handleSectionAction(act: string, id: string, fix?: string): void {
  switch (act) {
    case 'toggle-rules':
      if (collapsedRules.has(id)) collapsedRules.delete(id);
      else collapsedRules.add(id);
      render();
      break;
    case 'delete-section':
      // First click — enter inline confirm mode. Don't send to extension yet.
      confirmingDelete.add(id);
      render();
      break;
    case 'cancel-delete':
      confirmingDelete.delete(id);
      render();
      break;
    case 'confirm-delete':
      // User confirmed inline — send delete request with confirmed flag.
      vscode.postMessage({ type: 'delete-section', sectionId: id, confirmed: true });
      confirmingDelete.delete(id);
      break;
    case 'edit':
      editing.add(id);
      vscode.postMessage({ type: 'editing-start', sectionId: id });
      render();
      break;
    case 'cancel':
      editing.delete(id);
      vscode.postMessage({ type: 'editing-stop', sectionId: id });
      render();
      break;
    case 'save': {
      const ta = document.querySelector<HTMLTextAreaElement>(`textarea.editor[data-id="${CSS.escape(id)}"]`);
      if (!ta) return;
      const mirror = askMirror();
      vscode.postMessage({ type: 'save-section', sectionId: id, content: ta.value, mirror });
      editing.delete(id);
      vscode.postMessage({ type: 'editing-stop', sectionId: id });
      break;
    }
    case 'save-fm': {
      const form = document.querySelector<HTMLElement>(`.fm-form[data-id="${CSS.escape(id)}"]`);
      if (!form) return;
      const name = (form.querySelector<HTMLInputElement>('[data-field="name"]')?.value || '').trim();
      const description = (form.querySelector<HTMLTextAreaElement>('[data-field="description"]')?.value || '').trim();
      const cats = (form.querySelector<HTMLInputElement>('[data-field="categories"]')?.value || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
      const extra = form.querySelector<HTMLTextAreaElement>('[data-field="extra"]')?.value || '';
      const yaml = buildFmYaml({ name, description, categories: cats, extra });
      const mirror = askMirror();
      vscode.postMessage({ type: 'save-section', sectionId: id, content: yaml, mirror });
      editing.delete(id);
      vscode.postMessage({ type: 'editing-stop', sectionId: id });
      break;
    }
    case 'quick-fix':
      if (!fix) return;
      vscode.postMessage({ type: 'quick-fix', sectionId: id, fix });
      break;
  }
}

window.addEventListener('message', ev => {
  const m = ev.data;
  if (m.type === 'payload' || m.type === 'saved') {
    payload = m.payload;
    if (m.type === 'saved') externalDirty = false;
    render();
  } else if (m.type === 'save-error') {
    alert(`Save failed: ${m.error}`);
  } else if (m.type === 'external-change') {
    externalDirty = true;
    render();
    if (!confirm('SKILL.md was modified outside the preview.\n\nDiscard your changes and reload?')) return;
    editing.clear();
    vscode.postMessage({ type: 'refresh' });
  }
});

vscode.postMessage({ type: 'ready' });
