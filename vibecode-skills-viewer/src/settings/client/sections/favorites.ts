namespace FavoritesSection {
  export const id = 'favorites';
  export const tabKey = 'settings.tabnav.favorites';

  export function render(): string {
    const p = S.payload();
    if (!p) return '';
    const { favoritesCount } = p;
    return `<section>
      <h2>${S.ico('star')} ${S.esc(S.t('settings.section.favorites'))}</h2>
      <div class="body">
        <dl class="info-grid">
          <dt>${S.esc(S.t('settings.favorites.pinned'))}</dt>
          <dd>${favoritesCount}</dd>
        </dl>
        <div class="actions">
          <button class="btn danger" data-action="clear-favorites" ${favoritesCount === 0 ? 'disabled' : ''}>${S.ico('star-empty')} ${S.esc(S.t('settings.favorites.clear'))}</button>
        </div>
      </div>
    </section>`;
  }

  export function bind(): void {
    document.querySelectorAll<HTMLButtonElement>('[data-action="clear-favorites"]').forEach(btn => {
      btn.onclick = () => S.vscode.postMessage({ type: 'clear-favorites' });
    });
  }
}
