namespace AboutSection {
  export const id = 'about';
  export const tabKey = 'settings.tabnav.about';

  export function render(): string {
    const p = S.payload();
    if (!p) return '';
    return `<section>
      <h2>${S.ico('info')} ${S.esc(S.t('settings.section.aboutInfo'))}</h2>
      <div class="body">
        <dl class="info-grid">
          <dt>${S.esc(S.t('settings.about.version.label'))}</dt>
          <dd>${S.esc(p.extensionVersion)}</dd>
          <dt>${S.esc(S.t('settings.about.storage.label'))}</dt>
          <dd>${S.esc(S.t('settings.about.storage.value'))}</dd>
        </dl>
        <div class="actions">
          <button class="btn" data-action="open-vscode-settings">${S.ico('gear')} ${S.esc(S.t('settings.about.openVscodeSettings.label'))}</button>
          <button class="btn" data-action="reload-window">${S.ico('refresh')} ${S.esc(S.t('settings.about.reloadWindow.label'))}</button>
        </div>
      </div>
    </section>`;
  }

  export function bind(): void {
    document.querySelectorAll<HTMLButtonElement>('[data-action="open-vscode-settings"], [data-action="reload-window"]').forEach(btn => {
      btn.onclick = () => S.vscode.postMessage({ type: btn.dataset.action });
    });
  }
}
