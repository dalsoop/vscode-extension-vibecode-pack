/// <reference path="../_refs.d.ts" />

namespace DetailClient {
  export function wireActions(): void {
    elements.root.addEventListener('click', (ev) => {
      const target = ev.target as HTMLElement;
      const action = target.dataset.action;
      if (action === 'openSource') vscode.postMessage({ type: 'openSource' });
      else if (action === 'copyCommand') vscode.postMessage({ type: 'copyCommand' });
      else if (action === 'refresh') vscode.postMessage({ type: 'refresh' });
      if (target.classList.contains('env-toggle')) {
        const key = target.dataset.key!;
        const val = elements.root.querySelector(`.env-val[data-key="${CSS.escape(key)}"]`) as HTMLElement | null;
        if (val) {
          const showing = target.textContent === 'hide';
          if (showing) {
            const m = val.dataset.full ?? '';
            val.textContent = m.length <= 4 ? '•'.repeat(m.length) : m.slice(0, 2) + '••••' + m.slice(-2);
            target.textContent = 'show';
          } else {
            val.textContent = val.dataset.full ?? '';
            target.textContent = 'hide';
          }
          vscode.postMessage({ type: 'revealEnvKey', key });
        }
      }
    });
  }
}
