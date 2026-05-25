namespace PreviewSection {
  export const id = 'preview';
  export const tabKey = 'settings.tabnav.preview';

  export function render(): string {
    return `<section>
      <h2>${S.ico('eye')} ${S.esc(S.t('settings.section.preview'))}</h2>
      <div class="body">
        ${S.switchEl('showScoreBreakdown', S.t('settings.preview.scoreBreakdown.label'), S.t('settings.preview.scoreBreakdown.hint'))}
      </div>
    </section>`;
  }

  export function bind(): void {
    // boolean switches bound by S.bindSwitches at the orchestrator level
  }
}
