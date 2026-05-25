namespace LanguageSection {
  export const id = 'language';
  export const tabKey = 'settings.tabnav.language';

  const LANGUAGES: Array<'auto' | 'en' | 'ko'> = ['auto', 'en', 'ko'];

  export function render(): string {
    const current = S.payload()?.config.language ?? 'auto';
    const options = LANGUAGES.map(
      code =>
        `<option value="${code}" ${current === code ? 'selected' : ''}>${S.esc(S.t(`settings.language.${code}`))}</option>`
    ).join('');
    return `<section>
      <h2>${S.ico('globe')} ${S.esc(S.t('settings.section.language'))}</h2>
      <div class="body">
        <div class="row">
          <span class="row-label">${S.esc(S.t('settings.language.label'))}</span>
          <span class="row-hint">${S.esc(S.t('settings.language.hint'))}</span>
          <div class="row-control">
            <select class="select" data-key="language">${options}</select>
          </div>
        </div>
      </div>
    </section>`;
  }

  export function bind(): void {
    document.querySelectorAll<HTMLSelectElement>('select[data-key="language"]').forEach(el => {
      el.onchange = () => S.setKey('language', el.value);
    });
  }
}
