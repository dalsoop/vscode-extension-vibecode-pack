namespace ToolsSection {
  export const id = 'tools';
  export const tabKey = 'settings.tabnav.tools';

  function tools(): S.ToolDef[] {
    return (S.payload()?.config.tools || []).map(t => ({ ...t }));
  }

  function commit(list: S.ToolDef[]): void {
    S.setKey('tools', list);
  }

  export function render(): string {
    const list = tools();
    const cards = list
      .map(
        (tool, i) => `<div class="tool-card" data-i="${i}">
          <label class="tool-card-enable" title="${S.esc(S.t('settings.toolFilter.enabled.label'))}">
            <input type="checkbox" data-tool-enable data-i="${i}" ${tool.enabled ? 'checked' : ''}>
          </label>
          <input class="input tool-card-label" data-tool-label data-i="${i}" value="${S.esc(tool.label)}" placeholder="${S.esc(S.t('settings.tools.labelPlaceholder'))}">
          <span class="tool-card-id">${S.esc(tool.id)}${tool.builtin ? ` <span class="tool-card-badge">${S.esc(S.t('settings.tools.builtin'))}</span>` : ''}</span>
          <button class="btn danger tool-card-delete" data-tool-delete data-i="${i}" title="${S.esc(S.t('settings.tools.delete'))}">${S.ico('trash')}</button>
        </div>`
      )
      .join('');
    return `<section>
      <h2>${S.ico('tools')} ${S.esc(S.t('settings.section.tools'))}</h2>
      <div class="body">
        <p class="row-hint" style="margin-bottom: 12px;">${S.esc(S.t('settings.tools.intro'))}</p>
        ${S.switchEl('showToolChips', S.t('settings.tools.showChips.label'), S.t('settings.tools.showChips.hint'))}
        <div class="tool-card-list">${cards || `<div class="cs-empty">${S.esc(S.t('hub.empty.noItems'))}</div>`}</div>
        <div class="actions" style="margin-top: 12px; flex-wrap: wrap;">
          <button class="btn primary" data-tool-add>${S.ico('add')} ${S.esc(S.t('settings.tools.add'))}</button>
          <button class="btn" data-tool-enable-all>${S.esc(S.t('settings.tools.enableAll'))}</button>
          <button class="btn" data-tool-disable-all>${S.esc(S.t('settings.tools.disableAll'))}</button>
          <button class="btn" data-tool-reset>${S.ico('discard')} ${S.esc(S.t('settings.tools.resetDefaults'))}</button>
        </div>
      </div>
    </section>`;
  }

  export function bind(): void {
    const list = tools();

    document.querySelectorAll<HTMLInputElement>('input[data-tool-enable]').forEach(el => {
      el.onchange = () => {
        const i = parseInt(el.dataset.i || '0', 10);
        if (!list[i]) return;
        list[i].enabled = el.checked;
        commit(list);
      };
    });
    document.querySelectorAll<HTMLInputElement>('input[data-tool-label]').forEach(el => {
      el.onblur = () => {
        const i = parseInt(el.dataset.i || '0', 10);
        if (!list[i]) return;
        const next = el.value.trim();
        if (!next || next === list[i].label) return;
        list[i].label = next;
        commit(list);
      };
    });
    document.querySelectorAll<HTMLButtonElement>('button[data-tool-delete]').forEach(btn => {
      btn.onclick = () => {
        const i = parseInt(btn.dataset.i || '0', 10);
        if (!list[i]) return;
        if (!confirm(S.t('settings.tools.deleteConfirm', list[i].label || list[i].id))) return;
        list.splice(i, 1);
        commit(list);
      };
    });
    const addBtn = document.querySelector<HTMLButtonElement>('[data-tool-add]');
    if (addBtn) {
      addBtn.onclick = () => {
        const id = prompt(S.t('settings.tools.addDialog.id'));
        if (!id) return;
        const slug = id.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
        if (!slug) return;
        if (list.some(t => t.id === slug)) {
          alert(S.t('settings.tools.addDialog.duplicate', slug));
          return;
        }
        const label = prompt(S.t('settings.tools.addDialog.label'), slug);
        if (label === null) return;
        list.push({ id: slug, label: label.trim() || slug, enabled: true });
        commit(list);
      };
    }
    const enAll = document.querySelector<HTMLButtonElement>('[data-tool-enable-all]');
    if (enAll) {
      enAll.onclick = () => {
        for (const t of list) t.enabled = true;
        commit(list);
      };
    }
    const disAll = document.querySelector<HTMLButtonElement>('[data-tool-disable-all]');
    if (disAll) {
      disAll.onclick = () => {
        for (const t of list) t.enabled = false;
        commit(list);
      };
    }
    const reset = document.querySelector<HTMLButtonElement>('[data-tool-reset]');
    if (reset) {
      reset.onclick = () => {
        if (!confirm(S.t('settings.tools.resetConfirm'))) return;
        commit(S.DEFAULT_TOOLS.map(d => ({ ...d })));
      };
    }
  }
}
