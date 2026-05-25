// Interactive preview client. Compiled via tsconfig.preview-client.json.
// All shared types come from the ambient `Contracts.*` namespace in
// src/contracts/*.d.ts (single source of truth shared with the extension).

declare function acquireVsCodeApi(): { postMessage(msg: any): void };
const vscode = acquireVsCodeApi();

let payload: Contracts.PreviewPayload | null = null;
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

function tr(key: string, ...args: Array<string | number>): string {
  const raw = (payload?.i18n.dict[key] ?? key) as string;
  if (!args.length) return raw;
  return raw.replace(/\{(\d+)\}/g, (_m, i) => {
    const v = args[Number(i)];
    return v === undefined ? '' : String(v);
  });
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
  // If every mirror entry is marked alwaysMirror, skip the prompt.
  const allAlways = mirrors.every(m => !!m.alwaysMirror);
  if (allAlways) return true;
  const summary = mirrors
    .map(m => {
      const label = m.source === 'group' ? m.groupLabel || tr('preview.mirror.group.label') : tr('preview.mirror.skillsSharingName');
      const tag = m.alwaysMirror ? tr('preview.mirror.always') : '';
      return `[${label}${tag}]\n  ` + m.targets.join('\n  ');
    })
    .join('\n\n');
  return confirm(tr('preview.confirm.mirror', count, summary));
}

function renderHeader(): void {
  if (!payload) return;
  const { meta } = payload;
  $('title').textContent = meta.name;
  const roBadge = meta.source.readOnly
    ? `<span class="badge ro" title="${esc(tr('preview.badge.readOnly.tooltip'))}">${esc(tr('preview.badge.readOnly.label'))}</span>`
    : '';
  const extBadge = externalDirty ? `<span class="badge warn">${esc(tr('preview.badge.externalChange'))}</span>` : '';
  const mirrorCount = (meta.mirrors || []).reduce((a, m) => a + m.targets.length, 0);
  const drift = (meta.mirrorDrift || []).filter(d => !d.inSync);
  const driftCount = drift.length;
  let mirrorBadge = '';
  if (mirrorCount) {
    const tooltip = (meta.mirrors || [])
      .map(m => {
        const tag = m.alwaysMirror ? tr('preview.mirror.alwaysTag') : '';
        const label =
          (m.source === 'group' ? m.groupLabel || tr('preview.mirror.group.label') : tr('preview.mirror.skillByName')) + tag;
        const lines = m.targets.map(target => {
          const driftEntry = (meta.mirrorDrift || []).find(d => d.path === target);
          const mark = !driftEntry
            ? tr('preview.mirror.mark.unknown')
            : !driftEntry.exists
              ? tr('preview.mirror.mark.missing')
              : driftEntry.inSync
                ? tr('preview.mirror.mark.ok')
                : tr('preview.mirror.mark.differs');
          return `  ${mark} ${target}`;
        });
        return `${label}:\n${lines.join('\n')}`;
      })
      .join('\n\n');
    if (driftCount > 0) {
      mirrorBadge = `<span class="badge mirror drift" title="${esc(tooltip)}">${ico('warning')} ${esc(tr('preview.mirror.driftBadge', driftCount, mirrorCount))}</span>`;
    } else {
      mirrorBadge = `<span class="badge mirror ok" title="${esc(tooltip)}">${ico('link')} ${esc(tr('preview.mirror.okBadge', mirrorCount))}</span>`;
    }
  }
  $('meta').innerHTML = [
    `<span class="badge">${esc(meta.source.label)}</span>`,
    `<span class="badge">${esc(meta.source.scope)}</span>`,
    roBadge,
    extBadge,
    mirrorBadge,
    ...meta.categories.map(c => `<span class="badge">${esc(c)}</span>`),
    `<span class="score ${meta.totalScore.color}" title="${esc(meta.totalScore.issues.join('\n') || tr('preview.score.noIssues'))}">${esc(tr('preview.score.fmt', meta.totalScore.pct, meta.totalScore.grade))}</span>`,
    `<span style="opacity:0.7">${esc(tr('preview.stats.lineCharsAge', meta.lines, (meta.chars / 1024).toFixed(1), Math.floor(meta.ageDays)))}</span>`
  ].join('');
  const showScore = meta.showScoreBreakdown;
  const driftPeers = (meta.mirrorDrift || []).filter(d => !d.inSync);
  const mirrorButtons: string[] = [];
  if (mirrorCount > 0) {
    if (driftPeers.length > 0) {
      mirrorButtons.push(
        `<button class="tbtn danger" data-act="mirror-sync" title="${esc(tr('preview.toolbar.mirrorSync.title'))}">${ico('cloud-upload')} ${esc(tr('preview.toolbar.mirrorSync.label', driftPeers.length))}</button>`
      );
      // Diff with first drifted peer
      const firstDrift = driftPeers.find(d => d.exists);
      if (firstDrift) {
        mirrorButtons.push(
          `<button class="tbtn" data-act="mirror-diff" data-peer="${esc(firstDrift.path)}" title="${esc(tr('preview.toolbar.mirrorDiff.title', firstDrift.path))}">${ico('diff')} ${esc(tr('preview.toolbar.mirrorDiff.label'))}</button>`
        );
      }
    }
  }
  $('toolbar').innerHTML = [
    `<button class="tbtn" data-act="open">${ico('go-to-file')} ${esc(tr('preview.toolbar.open'))}</button>`,
    `<button class="tbtn" data-act="copy-md">${ico('copy')} ${esc(tr('preview.toolbar.copyMd'))}</button>`,
    `<button class="tbtn" data-act="copy-path">${ico('files')} ${esc(tr('preview.toolbar.copyPath'))}</button>`,
    `<button class="tbtn" data-act="finder">${ico('folder-opened')} ${esc(tr('preview.toolbar.finder'))}</button>`,
    `<button class="tbtn" data-act="terminal">${ico('terminal')} ${esc(tr('preview.toolbar.terminal'))}</button>`,
    `<button class="tbtn ${showScore ? 'active' : ''}" data-act="toggle-score" title="${esc(tr('preview.toolbar.toggleScoreTitle'))}">${ico(showScore ? 'eye' : 'eye-closed')} ${esc(tr(showScore ? 'preview.toolbar.hideScores' : 'preview.toolbar.showScores'))}</button>`,
    ...mirrorButtons,
    `<button class="tbtn" data-act="refresh">${ico('refresh')} ${esc(tr('preview.toolbar.refresh'))}</button>`
  ].join('');
  $('toolbar')
    .querySelectorAll<HTMLButtonElement>('.tbtn')
    .forEach(b => {
      b.onclick = () => {
        const a = b.dataset.act;
        if (a === 'toggle-score') {
          vscode.postMessage({ type: 'toggle-score-breakdown', value: !showScore });
        } else if (a === 'mirror-sync') {
          const willCreate = tr('preview.confirm.mirrorSync.willCreate');
          const detail = driftPeers.map(d => `  • ${d.path}${d.exists ? '' : willCreate}`).join('\n');
          if (confirm(tr('preview.confirm.mirrorSync', driftPeers.length, detail))) {
            vscode.postMessage({ type: 'mirror-sync-from-here' });
          }
        } else if (a === 'mirror-diff') {
          vscode.postMessage({ type: 'mirror-diff', peer: b.dataset.peer });
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

function renderFrontmatterForm(s: Contracts.PreviewSection): string {
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
        <span class="fm-label">${esc(tr('preview.fm.name'))}</span>
        <input class="fm-input" data-field="name" value="${esc(fm.name || '')}" placeholder="${esc(tr('preview.fm.namePlaceholder'))}">
      </label>
      <label class="fm-row">
        <span class="fm-label">${esc(tr('preview.fm.description'))} <span class="fm-counter ${descClass}">${esc(tr('preview.fm.descCounter', descLen))}</span></span>
        <textarea class="fm-textarea" data-field="description" rows="3" placeholder="${esc(tr('preview.fm.descPlaceholder'))}">${esc(fm.description || '')}</textarea>
      </label>
      <label class="fm-row">
        <span class="fm-label">${esc(tr('preview.fm.categories'))} <span class="fm-hint">${esc(tr('preview.fm.categoriesHint'))}</span></span>
        <input class="fm-input" data-field="categories" value="${esc((fm.categories || []).join(', '))}" placeholder="${esc(tr('preview.fm.categoriesPlaceholder'))}">
      </label>
      ${extra ? `<label class="fm-row"><span class="fm-label">${esc(tr('preview.fm.otherYaml'))}</span><textarea class="fm-textarea" data-field="extra" rows="3">${esc(extra)}</textarea></label>` : ''}
      <div class="edit-row">
        <button class="tbtn" data-sect-act="cancel" data-id="${esc(s.id)}">${esc(tr('preview.section.editor.cancel'))}</button>
        <button class="tbtn primary" data-sect-act="save-fm" data-id="${esc(s.id)}">${ico('save')} ${esc(tr('preview.section.editor.save'))}</button>
      </div>
    </div>`;
}

function renderSection(s: Contracts.PreviewSection): string {
  const isEditing = editing.has(s.id);
  const globallyHidden = payload && !payload.meta.showScoreBreakdown;
  const rulesCollapsed = globallyHidden || collapsedRules.has(s.id);
  const kind = s.canonical || s.kind;
  const label = s.heading || (s.canonical === 'frontmatter' ? tr('preview.section.frontmatter') : tr('preview.section.section'));
  const ro = readOnly();
  const lowScore = s.score.pct < 60;
  const fails = s.score.rules.filter(r => !r.pass);
  const passes = s.score.rules.filter(r => r.pass);

  const editButtons = ro
    ? `<button class="sa" disabled title="${esc(tr('preview.section.title.readOnly'))}">${ico('lock')}</button>`
    : `<button class="sa" data-sect-act="${isEditing ? 'cancel' : 'edit'}" data-id="${esc(s.id)}" title="${esc(tr(isEditing ? 'preview.section.title.cancel' : 'preview.section.title.edit'))}">${ico(isEditing ? 'close' : 'edit')}</button>`;

  const isConfirming = confirmingDelete.has(s.id);
  const deleteButton = ro
    ? ''
    : isConfirming
      ? `<button class="sa danger active" data-sect-act="cancel-delete" data-id="${esc(s.id)}" title="${esc(tr('preview.section.title.cancelDelete'))}">${ico('close')}</button>`
      : `<button class="sa danger" data-sect-act="delete-section" data-id="${esc(s.id)}" title="${esc(tr('preview.section.title.delete'))}">${ico('trash')}</button>`;

  const head = `
    <div class="section-head">
      <span class="section-title">
        <span class="kind-pill">${esc(kind)}</span>
        ${esc(label)}
        <span class="score ${s.score.color}" title="${esc(s.score.issues.join('\n') || tr('preview.score.allChecksPass'))}">${s.score.pct}/100</span>
        ${fails.length ? `<span class="fail-count">${esc(tr('preview.section.issueCount', fails.length))}</span>` : `<span class="pass-tag">${esc(tr('preview.section.clean'))}</span>`}
      </span>
      <span class="section-actions">
        <button class="sa" data-sect-act="toggle-rules" data-id="${esc(s.id)}" title="${esc(tr(rulesCollapsed ? 'preview.section.toggle.showBreakdown' : 'preview.section.toggle.hideBreakdown'))}">${ico(rulesCollapsed ? 'chevron-down' : 'chevron-up')}</button>
        ${editButtons}
        ${deleteButton}
      </span>
    </div>`;

  // Score breakdown — ALWAYS visible (failed rules first, then passed in muted style)
  const renderRule = (r: Contracts.PreviewSectionRule): string => {
    const fix = !r.pass && !ro && FIX_BY_RULE[r.id];
    const fixBtn = fix
      ? `<button class="fix-btn" data-sect-act="quick-fix" data-id="${esc(s.id)}" data-fix="${esc(fix)}" title="${esc(tr('preview.section.fix.title'))}">${ico('wand')} ${esc(tr('preview.section.fix.label'))}</button>`
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
              <div class="rules-group-title">${esc(tr('preview.rules.lost', fails.reduce((a, r) => a + r.weight, 0)))}</div>
              <ul class="rules">${fails.map(renderRule).join('')}</ul>
            </div>`
            : ''
        }
        ${
          passes.length
            ? `<div class="rules-group muted">
              <div class="rules-group-title">${esc(tr('preview.rules.earned', passes.reduce((a, r) => a + r.weight, 0)))}</div>
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
          <div class="dc-title">${esc(tr('preview.section.deleteConfirm.title'))}</div>
          <div class="dc-desc">${esc(tr('preview.section.deleteConfirm.desc'))}</div>
          <div class="dc-target">${esc(s.canonical || s.kind)} · ${esc(s.heading || s.id)}</div>
        </div>
        <div class="dc-actions">
          <button class="tbtn" data-sect-act="cancel-delete" data-id="${esc(s.id)}">${esc(tr('preview.section.deleteConfirm.cancel'))}</button>
          <button class="tbtn danger" data-sect-act="confirm-delete" data-id="${esc(s.id)}">${ico('trash')} ${esc(tr('preview.section.deleteConfirm.delete'))}</button>
        </div>
      </div>`;
  } else if (isEditing && s.canonical === 'frontmatter') {
    bodyHtml = renderFrontmatterForm(s);
  } else if (isEditing) {
    bodyHtml = `<textarea class="editor" data-id="${esc(s.id)}">${esc(s.raw)}</textarea>
       <div class="edit-row">
         <button class="tbtn" data-sect-act="cancel" data-id="${esc(s.id)}">${esc(tr('preview.section.editor.cancel'))}</button>
         <button class="tbtn primary" data-sect-act="save" data-id="${esc(s.id)}">${ico('save')} ${esc(tr('preview.section.editor.save'))}</button>
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
    <div class="section-head"><span class="section-title"><span class="kind-pill">${esc(tr('preview.aux.kind'))}</span> ${esc(tr('preview.aux.title'))}</span></div>
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
      btn.title = tr('preview.copyCode');
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
        counter.textContent = tr('preview.fm.descCounter', len);
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
    <div class="toc-title">${esc(tr('preview.toc.title'))}</div>
    ${payload.toc
      .map(
        entry => `
      <a class="toc-item" href="#sect-${esc(entry.id)}" data-jump="${esc(entry.id)}">
        <span class="toc-dot" style="background:${colorFor(entry.score)}"></span>
        <span class="toc-label">${esc(entry.label)}</span>
        <span class="toc-score" style="color:${colorFor(entry.score)}">${entry.score}</span>
      </a>`
      )
      .join('')}
  </aside>`;
}

function renderYamlError(): string {
  const e = payload?.meta.frontmatterError;
  if (!e) return '';
  const where = e.line ? (e.column ? tr('preview.yaml.whereCol', e.line, e.column) : tr('preview.yaml.where', e.line)) : '';
  const openBtn = e.line
    ? `<button class="tbtn" data-yaml-act="open-at-line" data-line="${e.line}" data-column="${e.column || 1}">${ico('go-to-file')} ${esc(tr('preview.yaml.openAt', where))}</button>`
    : '';
  return `<div class="yaml-error">
    <div class="ye-head">
      <span class="ye-icon">${ico('error')}</span>
      <strong>${esc(tr('preview.yaml.headTitle'))}</strong>
    </div>
    <div class="ye-msg">${esc(e.message)} ${where ? `<code>(${esc(where)})</code>` : ''}</div>
    ${e.snippet ? `<pre class="ye-snippet">${esc(e.snippet)}</pre>` : ''}
    <div class="ye-hint">${esc(tr('preview.yaml.commonFix'))}</div>
    <div class="ye-actions">
      <button class="tbtn primary" data-yaml-act="autofix">${ico('wand')} ${esc(tr('preview.yaml.autofix'))}</button>
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
          alert(tr('preview.alert.readOnly'));
          return;
        }
        if (confirm(tr('preview.confirm.autofix'))) {
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
    alert(tr('preview.alert.saveFailed', m.error));
  } else if (m.type === 'external-change') {
    externalDirty = true;
    render();
    if (!confirm(tr('preview.confirm.externalChange'))) return;
    editing.clear();
    vscode.postMessage({ type: 'refresh' });
  }
});

vscode.postMessage({ type: 'ready' });
