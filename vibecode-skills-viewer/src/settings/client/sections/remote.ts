namespace RemoteSection {
  export const id = 'remote';
  export const tabKey = 'settings.tabnav.remote';

  export function render(): string {
    const config = S.payload()?.config;
    if (!config) return '';
    return `<section>
      <h2>${S.ico('github')} ${S.esc(S.t('settings.section.remote'))}</h2>
      <div class="body">
        <div class="row">
          <span class="row-label">${S.esc(S.t('settings.remote.githubToken.label'))}</span>
          <span class="row-hint">${S.esc(S.t('settings.remote.githubToken.hint'))}</span>
          <div class="row-control">
            <input class="input" type="password" data-key="githubToken" value="${S.esc(config.githubToken)}" placeholder="${S.esc(S.t('settings.remote.githubToken.placeholder'))}">
          </div>
        </div>
      </div>
    </section>`;
  }

  export function bind(): void {
    document.querySelectorAll<HTMLInputElement>('input[type="password"][data-key="githubToken"]').forEach(el => {
      el.onblur = () => S.setKey('githubToken', el.value);
    });
  }
}
