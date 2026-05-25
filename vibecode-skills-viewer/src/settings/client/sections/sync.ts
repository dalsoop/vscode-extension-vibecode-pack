namespace SyncSection {
  export const id = 'sync';
  export const tabKey = 'settings.tabnav.sync';

  const FORMATS: Array<'ref' | 'compact' | 'full' | 'legacy'> = ['ref', 'compact', 'full', 'legacy'];

  export function render(): string {
    const config = S.payload()?.config;
    if (!config) return '';
    return `<section>
      <h2>${S.ico('sync')} ${S.esc(S.t('settings.section.instructionSync'))}</h2>
      <div class="body">
        <div class="row">
          <span class="row-label">${S.esc(S.t('settings.instructionSync.format.label'))}</span>
          <span class="row-hint">${S.esc(S.t('settings.instructionSync.format.hint'))}</span>
          <div class="radios" id="format-radios">
            ${FORMATS.map(
              v =>
                `<label class="radio ${config.instructionFormat === v ? 'active' : ''}"><input type="radio" name="fmt" value="${v}" ${config.instructionFormat === v ? 'checked' : ''}>${S.esc(S.t(`settings.format.${v}`))}</label>`
            ).join('')}
          </div>
        </div>
      </div>
    </section>`;
  }

  export function bind(): void {
    document.querySelectorAll<HTMLInputElement>('input[name="fmt"]').forEach(el => {
      el.onchange = () => S.setKey('instructionFormat', el.value);
    });
  }
}
