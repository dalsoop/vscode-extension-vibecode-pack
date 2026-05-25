// Renders a single SKILL.md section card with header (kind / title / score /
// actions), optional rule breakdown, and a body that is either rendered HTML,
// a generic textarea editor, the frontmatter form, or an inline delete confirm.

namespace SkillSection {
  function renderRule(s: P.Section, r: P.SectionRule): string {
    const ro = P.readOnly();
    const fix = !r.pass && !ro && P.FIX_BY_RULE[r.id];
    const fixBtn = fix
      ? `<button class="fix-btn" data-sect-act="quick-fix" data-id="${P.esc(s.id)}" data-fix="${P.esc(fix)}" title="${P.esc(P.t('preview.section.fix.title'))}">${P.ico('wand')} ${P.esc(P.t('preview.section.fix.label'))}</button>`
      : '';
    return `<li class="rule-li ${r.pass ? 'rule-pass' : 'rule-fail'}">
      <span class="mark">${r.pass ? '✓' : '✗'}</span>
      <span class="rule-msg">${P.esc(r.message)}</span>
      <span class="rule-pts">${r.pass ? '+' : '−'}${r.weight}pt</span>
      ${fixBtn}
    </li>`;
  }

  function renderRulesBlock(s: P.Section, rulesCollapsed: boolean): string {
    if (rulesCollapsed) return '';
    const fails = s.score.rules.filter(r => !r.pass);
    const passes = s.score.rules.filter(r => r.pass);
    const failsBlock = fails.length
      ? `<div class="rules-group">
          <div class="rules-group-title">${P.esc(P.t('preview.rules.lost', fails.reduce((a, r) => a + r.weight, 0)))}</div>
          <ul class="rules">${fails.map(r => renderRule(s, r)).join('')}</ul>
        </div>`
      : '';
    const passesBlock = passes.length
      ? `<div class="rules-group muted">
          <div class="rules-group-title">${P.esc(P.t('preview.rules.earned', passes.reduce((a, r) => a + r.weight, 0)))}</div>
          <ul class="rules">${passes.map(r => renderRule(s, r)).join('')}</ul>
        </div>`
      : '';
    return `<div class="rules-block">${failsBlock}${passesBlock}</div>`;
  }

  function renderHead(s: P.Section, isEditing: boolean, isConfirming: boolean, rulesCollapsed: boolean): string {
    const ro = P.readOnly();
    const kind = s.canonical || s.kind;
    const label =
      s.heading || (s.canonical === 'frontmatter' ? P.t('preview.section.frontmatter') : P.t('preview.section.section'));
    const fails = s.score.rules.filter(r => !r.pass);

    const editButtons = ro
      ? `<button class="sa" disabled title="${P.esc(P.t('preview.section.title.readOnly'))}">${P.ico('lock')}</button>`
      : `<button class="sa" data-sect-act="${isEditing ? 'cancel' : 'edit'}" data-id="${P.esc(s.id)}" title="${P.esc(P.t(isEditing ? 'preview.section.title.cancel' : 'preview.section.title.edit'))}">${P.ico(isEditing ? 'close' : 'edit')}</button>`;
    const deleteButton = ro
      ? ''
      : isConfirming
        ? `<button class="sa danger active" data-sect-act="cancel-delete" data-id="${P.esc(s.id)}" title="${P.esc(P.t('preview.section.title.cancelDelete'))}">${P.ico('close')}</button>`
        : `<button class="sa danger" data-sect-act="delete-section" data-id="${P.esc(s.id)}" title="${P.esc(P.t('preview.section.title.delete'))}">${P.ico('trash')}</button>`;

    return `
      <div class="section-head">
        <span class="section-title">
          <span class="kind-pill">${P.esc(kind)}</span>
          ${P.esc(label)}
          <span class="score ${s.score.color}" title="${P.esc(s.score.issues.join('\n') || P.t('preview.score.allChecksPass'))}">${s.score.pct}/100</span>
          ${fails.length ? `<span class="fail-count">${P.esc(P.t('preview.section.issueCount', fails.length))}</span>` : `<span class="pass-tag">${P.esc(P.t('preview.section.clean'))}</span>`}
        </span>
        <span class="section-actions">
          <button class="sa" data-sect-act="toggle-rules" data-id="${P.esc(s.id)}" title="${P.esc(P.t(rulesCollapsed ? 'preview.section.toggle.showBreakdown' : 'preview.section.toggle.hideBreakdown'))}">${P.ico(rulesCollapsed ? 'chevron-down' : 'chevron-up')}</button>
          ${editButtons}
          ${deleteButton}
        </span>
      </div>`;
  }

  function renderBody(s: P.Section, isEditing: boolean, isConfirming: boolean): string {
    if (isConfirming) {
      return `<div class="delete-confirm">
          <div class="dc-icon">${P.ico('warning')}</div>
          <div class="dc-text">
            <div class="dc-title">${P.esc(P.t('preview.section.deleteConfirm.title'))}</div>
            <div class="dc-desc">${P.esc(P.t('preview.section.deleteConfirm.desc'))}</div>
            <div class="dc-target">${P.esc(s.canonical || s.kind)} · ${P.esc(s.heading || s.id)}</div>
          </div>
          <div class="dc-actions">
            <button class="tbtn" data-sect-act="cancel-delete" data-id="${P.esc(s.id)}">${P.esc(P.t('preview.section.deleteConfirm.cancel'))}</button>
            <button class="tbtn danger" data-sect-act="confirm-delete" data-id="${P.esc(s.id)}">${P.ico('trash')} ${P.esc(P.t('preview.section.deleteConfirm.delete'))}</button>
          </div>
        </div>`;
    }
    if (isEditing && s.canonical === 'frontmatter') return FrontmatterForm.render(s);
    if (isEditing) {
      return `<textarea class="editor" data-id="${P.esc(s.id)}">${P.esc(s.raw)}</textarea>
         <div class="edit-row">
           <button class="tbtn" data-sect-act="cancel" data-id="${P.esc(s.id)}">${P.esc(P.t('preview.section.editor.cancel'))}</button>
           <button class="tbtn primary" data-sect-act="save" data-id="${P.esc(s.id)}">${P.ico('save')} ${P.esc(P.t('preview.section.editor.save'))}</button>
         </div>`;
    }
    return `<div class="rendered">${s.rendered}</div>`;
  }

  export function render(s: P.Section): string {
    const isEditing = P.editing.has(s.id);
    const isConfirming = P.confirmingDelete.has(s.id);
    const globallyHidden = P.payload() && !P.payload()!.meta.showScoreBreakdown;
    const rulesCollapsed = !!globallyHidden || P.collapsedRules.has(s.id);
    const lowScore = s.score.pct < 60;
    const classes = ['section', lowScore ? 'low-score' : '', isConfirming ? 'confirming' : '']
      .filter(Boolean)
      .join(' ');
    return `<section class="${classes}" data-section="${P.esc(s.id)}" id="sect-${P.esc(s.id)}">
      ${renderHead(s, isEditing, isConfirming, rulesCollapsed)}
      <div class="section-body">
        ${isConfirming ? '' : renderRulesBlock(s, rulesCollapsed)}
        ${renderBody(s, isEditing, isConfirming)}
      </div>
    </section>`;
  }

  // Dispatch for data-sect-act buttons. Mutates UI-only state and either
  // calls P.rerender() locally or sends a message to the extension.
  export function handleAction(act: string, id: string, fix?: string): void {
    switch (act) {
      case 'toggle-rules':
        if (P.collapsedRules.has(id)) P.collapsedRules.delete(id);
        else P.collapsedRules.add(id);
        P.rerender();
        return;
      case 'delete-section':
        // First click — enter inline confirm mode. Don't send to extension yet.
        P.confirmingDelete.add(id);
        P.rerender();
        return;
      case 'cancel-delete':
        P.confirmingDelete.delete(id);
        P.rerender();
        return;
      case 'confirm-delete':
        // User confirmed inline — send delete request with confirmed flag.
        P.vscode.postMessage({ type: 'delete-section', sectionId: id, confirmed: true });
        P.confirmingDelete.delete(id);
        return;
      case 'edit':
        P.editing.add(id);
        P.vscode.postMessage({ type: 'editing-start', sectionId: id });
        P.rerender();
        return;
      case 'cancel':
        P.editing.delete(id);
        P.vscode.postMessage({ type: 'editing-stop', sectionId: id });
        P.rerender();
        return;
      case 'save': {
        const ta = document.querySelector<HTMLTextAreaElement>(`textarea.editor[data-id="${CSS.escape(id)}"]`);
        if (!ta) return;
        const mirror = P.askMirror();
        P.vscode.postMessage({ type: 'save-section', sectionId: id, content: ta.value, mirror });
        P.editing.delete(id);
        P.vscode.postMessage({ type: 'editing-stop', sectionId: id });
        return;
      }
      case 'save-fm': {
        const yaml = FrontmatterForm.collectYaml(id);
        if (yaml === null) return;
        const mirror = P.askMirror();
        P.vscode.postMessage({ type: 'save-section', sectionId: id, content: yaml, mirror });
        P.editing.delete(id);
        P.vscode.postMessage({ type: 'editing-stop', sectionId: id });
        return;
      }
      case 'quick-fix':
        if (!fix) return;
        P.vscode.postMessage({ type: 'quick-fix', sectionId: id, fix });
        return;
    }
  }
}
