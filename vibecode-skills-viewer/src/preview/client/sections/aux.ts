// "Auxiliary Files" card at the bottom — lists sibling files (README.md,
// NOTES.md, etc.) so the user can jump to them in an editor.

namespace AuxSection {
  export function render(): string {
    const p = P.payload();
    if (!p || !p.aux.length) return '';
    return `<section class="section">
      <div class="section-head"><span class="section-title"><span class="kind-pill">${P.esc(P.t('preview.aux.kind'))}</span> ${P.esc(P.t('preview.aux.title'))}</span></div>
      <div class="section-body">
        <div class="aux-files">
          ${p.aux
            .map(
              a =>
                `<span class="aux-file" data-aux="${P.esc(a.abs)}" title="${P.esc(a.abs)}">${P.ico('file')} ${P.esc(a.name)} <span style="opacity:0.6">(${(a.size / 1024).toFixed(1)}KB · ${P.esc(a.age)})</span></span>`
            )
            .join('')}
        </div>
      </div>
    </section>`;
  }

  export function bind(): void {
    P.$('main')
      .querySelectorAll<HTMLElement>('[data-aux]')
      .forEach(el => {
        el.onclick = () => P.vscode.postMessage({ type: 'open-file', path: el.dataset.aux });
      });
  }
}
