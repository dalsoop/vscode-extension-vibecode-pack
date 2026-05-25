namespace ExtraRootsSection {
  export const id = 'extraRoots';
  export const tabKey = 'settings.tabnav.extraRoots';

  function listEl(key: 'extraGlobalRoots' | 'extraWorkspaceRoots', label: string, hint: string): string {
    const list = (S.payload()?.config[key] || []) as string[];
    const rows = list
      .map(
        (p, i) =>
          `<div class="list-row">
        <input class="input" data-key="${key}" data-i="${i}" value="${S.esc(p)}">
        <button class="btn danger" data-action="remove" data-key="${key}" data-i="${i}">${S.ico('trash')}</button>
      </div>`
      )
      .join('');
    return `<div class="row">
      <span class="row-label">${S.esc(label)}</span>
      <span class="row-hint">${S.esc(hint)}</span>
      <div class="list">${rows || `<span class="row-hint" style="opacity:0.6">${S.esc(S.t('settings.extraRoots.noEntries'))}</span>`}</div>
      <div class="actions">
        <button class="btn" data-action="add" data-key="${key}">${S.ico('add')} ${S.esc(S.t('settings.extraRoots.addPath'))}</button>
      </div>
    </div>`;
  }

  export function render(): string {
    return `<section>
      <h2>${S.ico('folder-opened')} ${S.esc(S.t('settings.section.extraRoots'))}</h2>
      <div class="body">
        ${listEl('extraGlobalRoots', S.t('settings.extraRoots.global.label'), S.t('settings.extraRoots.global.hint'))}
        ${listEl('extraWorkspaceRoots', S.t('settings.extraRoots.workspace.label'), S.t('settings.extraRoots.workspace.hint'))}
      </div>
    </section>`;
  }

  export function bind(): void {
    document.querySelectorAll<HTMLInputElement>('input.input[data-key^="extra"]').forEach(el => {
      el.onblur = () => {
        const key = el.dataset.key as 'extraGlobalRoots' | 'extraWorkspaceRoots';
        const i = parseInt(el.dataset.i || '0', 10);
        const list = ((S.payload()?.config[key] || []) as string[]).slice();
        list[i] = el.value;
        S.setKey(key, list.filter(x => x.trim()));
      };
    });
    document.querySelectorAll<HTMLButtonElement>('[data-action="add"][data-key^="extra"], [data-action="remove"][data-key^="extra"]').forEach(btn => {
      btn.onclick = () => {
        const a = btn.dataset.action!;
        const key = btn.dataset.key as 'extraGlobalRoots' | 'extraWorkspaceRoots';
        const list = ((S.payload()?.config[key] || []) as string[]).slice();
        if (a === 'remove') {
          const i = parseInt(btn.dataset.i || '0', 10);
          list.splice(i, 1);
        } else if (a === 'add') {
          const v = prompt(S.t('settings.extraRoots.addPrompt'));
          if (!v) return;
          list.push(v.trim());
        }
        S.setKey(key, list);
      };
    });
  }
}
