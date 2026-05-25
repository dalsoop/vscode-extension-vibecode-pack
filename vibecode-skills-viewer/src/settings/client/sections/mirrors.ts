namespace MirrorsSection {
  export const id = 'mirrors';
  export const tabKey = 'settings.tabnav.mirrors';

  function renderPresets(): string {
    const presets = S.payload()?.mirrorPresets || [];
    if (!presets.length) return '';
    const items = presets
      .map(p => {
        const n = p.availablePaths.length;
        const disabled = n === 0 ? 'disabled' : '';
        const tooltip = n
          ? S.t('settings.mirrors.preset.willAdd', n, p.availablePaths.join('\n'))
          : S.t('settings.mirrors.preset.noneExist');
        return `<button class="btn ${n === 0 ? '' : 'primary'}" data-mg-act="apply-preset" data-preset="${S.esc(p.id)}" ${disabled} title="${S.esc(tooltip)}">
          ${S.ico(n ? 'rocket' : 'circle-slash')} ${S.esc(p.label)} <span style="opacity:0.7">(${n})</span>
        </button>`;
      })
      .join(' ');
    return `<div class="row">
      <span class="row-label">${S.esc(S.t('settings.mirrors.addFromPreset'))}</span>
      <span class="row-hint">${S.esc(S.t('settings.mirrors.fromPreset.hint'))}</span>
      <div class="actions" style="margin-top: 8px; flex-wrap: wrap;">${items}</div>
    </div>`;
  }

  function renderGroups(): string {
    const groups = S.payload()?.config.mirrorGroups || [];
    const cards = groups
      .map((g, i) => {
        const pathRows = g.paths
          .map(
            (p, pi) => `<div class="list-row">
              <input class="input" data-mg-path data-i="${i}" data-pi="${pi}" value="${S.esc(p)}">
              <button class="btn danger" data-mg-act="rm-path" data-i="${i}" data-pi="${pi}">${S.ico('trash')}</button>
            </div>`
          )
          .join('');
        return `<div class="mg-card" data-i="${i}">
          <div class="mg-head">
            <input class="input mg-label" data-mg-label data-i="${i}" value="${S.esc(g.label)}" placeholder="${S.esc(S.t('settings.mirrors.groupLabelPlaceholder'))}">
            <label class="switch small" title="${S.esc(S.t('settings.mirrors.alwaysMirrorTitle'))}">
              <input type="checkbox" data-mg-always data-i="${i}" ${g.alwaysMirror ? 'checked' : ''}>
              <span>${S.esc(S.t('settings.mirrors.alwaysMirror'))}</span>
            </label>
            <button class="btn danger" data-mg-act="rm-group" data-i="${i}">${S.ico('trash')} ${S.esc(S.t('settings.mirrors.removeGroup'))}</button>
          </div>
          <div class="list">${pathRows || `<span class="row-hint">${S.esc(S.t('settings.mirrors.noPaths'))}</span>`}</div>
          <button class="btn" data-mg-act="add-path" data-i="${i}">${S.ico('add')} ${S.esc(S.t('settings.mirrors.addPathToGroup'))}</button>
        </div>`;
      })
      .join('');
    return `${renderPresets()}
      <div class="mg-list">${cards || `<div class="cs-empty">${S.esc(S.t('settings.mirrors.noGroups'))}</div>`}</div>
      <button class="btn primary" data-mg-act="add-group">${S.ico('add')} ${S.esc(S.t('settings.mirrors.addGroup'))}</button>`;
  }

  export function render(): string {
    return `<section>
      <h2>${S.ico('link')} ${S.esc(S.t('settings.section.mirrors'))}</h2>
      <div class="body">
        <p class="row-hint" style="margin-bottom: 10px;">${S.esc(S.t('settings.mirrors.intro'))}</p>
        ${S.switchEl('mirrorSkillsByName', S.t('settings.mirrors.byName.label'), S.t('settings.mirrors.byName.hint'))}
        ${S.switchEl('mirrorSkillsByNameAlways', S.t('settings.mirrors.byNameAlways.label'), S.t('settings.mirrors.byNameAlways.hint'))}
        ${renderGroups()}
      </div>
    </section>`;
  }

  function commit(groups: S.MirrorGroup[]): void {
    S.setKey('mirrorGroups', groups);
  }

  export function bind(): void {
    const groups = (S.payload()?.config.mirrorGroups || []).map(g => ({ ...g, paths: [...g.paths] }));

    document.querySelectorAll<HTMLInputElement>('input[data-mg-label]').forEach(el => {
      el.onblur = () => {
        const i = parseInt(el.dataset.i || '0', 10);
        if (!groups[i]) return;
        groups[i].label = el.value.trim();
        commit(groups);
      };
    });
    document.querySelectorAll<HTMLInputElement>('input[data-mg-always]').forEach(el => {
      el.onchange = () => {
        const i = parseInt(el.dataset.i || '0', 10);
        if (!groups[i]) return;
        groups[i].alwaysMirror = el.checked;
        commit(groups);
      };
    });
    document.querySelectorAll<HTMLInputElement>('input[data-mg-path]').forEach(el => {
      el.onblur = () => {
        const i = parseInt(el.dataset.i || '0', 10);
        const pi = parseInt(el.dataset.pi || '0', 10);
        if (!groups[i]) return;
        groups[i].paths[pi] = el.value.trim();
        groups[i].paths = groups[i].paths.filter(p => p.length);
        commit(groups);
      };
    });
    document.querySelectorAll<HTMLButtonElement>('button[data-mg-act]').forEach(btn => {
      btn.onclick = () => {
        const act = btn.dataset.mgAct!;
        const i = parseInt(btn.dataset.i || '0', 10);
        const pi = parseInt(btn.dataset.pi || '0', 10);
        if (act === 'add-group') {
          const label = prompt(S.t('settings.mirrors.groupLabelPrompt'));
          if (!label) return;
          groups.push({ id: `g-${Date.now()}`, label: label.trim(), paths: [], alwaysMirror: false });
          commit(groups);
        } else if (act === 'rm-group') {
          if (!confirm(S.t('settings.mirrors.removeGroupConfirm', groups[i]?.label || ''))) return;
          groups.splice(i, 1);
          commit(groups);
        } else if (act === 'add-path') {
          const p = prompt(S.t('settings.mirrors.addPathPrompt'));
          if (!p) return;
          if (!groups[i]) return;
          groups[i].paths.push(p.trim());
          commit(groups);
        } else if (act === 'rm-path') {
          if (!groups[i]) return;
          groups[i].paths.splice(pi, 1);
          commit(groups);
        } else if (act === 'apply-preset') {
          S.vscode.postMessage({ type: 'mirror-apply-preset', presetId: btn.dataset.preset });
        }
      };
    });
  }
}
