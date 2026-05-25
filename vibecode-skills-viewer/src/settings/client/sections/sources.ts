namespace SourcesSection {
  export const id = 'sources';
  export const tabKey = 'settings.tabnav.sources';

  export function render(): string {
    return `<section>
      <h2>${S.ico('search')} ${S.esc(S.t('settings.section.sources'))}</h2>
      <div class="body">
        ${S.switchEl('includeWorkspace', S.t('settings.sources.workspace.label'), S.t('settings.sources.workspace.hint'))}
        ${S.switchEl('includeGlobal', S.t('settings.sources.global.label'), S.t('settings.sources.global.hint'))}
        ${S.switchEl('includeExtensions', S.t('settings.sources.extensions.label'), S.t('settings.sources.extensions.hint'))}
      </div>
    </section>`;
  }

  export function bind(): void {
    // booleans bound globally by S.bindSwitches()
  }
}
