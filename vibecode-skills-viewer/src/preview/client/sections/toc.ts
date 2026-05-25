// Right-rail table of contents. Each entry jumps to the matching section
// card via smooth-scroll.

namespace TocSection {
  function colorFor(n: number): string {
    return n >= 90 ? '#6bd58a' : n >= 75 ? '#b7df4d' : n >= 60 ? '#f4d03f' : n >= 40 ? '#ff9d3a' : '#ff6363';
  }

  export function render(): string {
    const p = P.payload();
    if (!p || p.toc.length === 0) return '';
    return `<aside id="toc">
      <div class="toc-title">${P.esc(P.t('preview.toc.title'))}</div>
      ${p.toc
        .map(
          entry => `
        <a class="toc-item" href="#sect-${P.esc(entry.id)}" data-jump="${P.esc(entry.id)}">
          <span class="toc-dot" style="background:${colorFor(entry.score)}"></span>
          <span class="toc-label">${P.esc(entry.label)}</span>
          <span class="toc-score" style="color:${colorFor(entry.score)}">${entry.score}</span>
        </a>`
        )
        .join('')}
    </aside>`;
  }

  export function bind(): void {
    P.$('main')
      .querySelectorAll<HTMLAnchorElement>('[data-jump]')
      .forEach(a => {
        a.onclick = e => {
          e.preventDefault();
          const id = a.dataset.jump!;
          const target = document.getElementById(`sect-${id}`);
          if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        };
      });
  }
}
