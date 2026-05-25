// Adds a "copy" button overlay to every <pre> code block in the rendered
// markdown. Runs after each re-render because the DOM is recreated.

namespace CodeCopy {
  export function inject(): void {
    P.$('main')
      .querySelectorAll<HTMLPreElement>('pre')
      .forEach(pre => {
        if (pre.querySelector('.code-copy')) return;
        const btn = document.createElement('button');
        btn.className = 'code-copy';
        btn.innerHTML = P.ico('copy');
        btn.title = P.t('preview.copyCode');
        btn.onclick = () => {
          const code = pre.querySelector('code')?.textContent || pre.textContent || '';
          navigator.clipboard.writeText(code);
          btn.classList.add('copied');
          setTimeout(() => btn.classList.remove('copied'), 1000);
        };
        pre.style.position = 'relative';
        pre.appendChild(btn);
      });
  }
}
