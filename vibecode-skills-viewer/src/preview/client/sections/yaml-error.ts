// YAML frontmatter error banner with auto-fix + open-at-line actions.

namespace YamlErrorSection {
  export function render(): string {
    const e = P.payload()?.meta.frontmatterError;
    if (!e) return '';
    const where = e.line
      ? e.column
        ? P.t('preview.yaml.whereCol', e.line, e.column)
        : P.t('preview.yaml.where', e.line)
      : '';
    const openBtn = e.line
      ? `<button class="tbtn" data-yaml-act="open-at-line" data-line="${e.line}" data-column="${e.column || 1}">${P.ico('go-to-file')} ${P.esc(P.t('preview.yaml.openAt', where))}</button>`
      : '';
    return `<div class="yaml-error">
      <div class="ye-head">
        <span class="ye-icon">${P.ico('error')}</span>
        <strong>${P.esc(P.t('preview.yaml.headTitle'))}</strong>
      </div>
      <div class="ye-msg">${P.esc(e.message)} ${where ? `<code>(${P.esc(where)})</code>` : ''}</div>
      ${e.snippet ? `<pre class="ye-snippet">${P.esc(e.snippet)}</pre>` : ''}
      <div class="ye-hint">${P.esc(P.t('preview.yaml.commonFix'))}</div>
      <div class="ye-actions">
        <button class="tbtn primary" data-yaml-act="autofix">${P.ico('wand')} ${P.esc(P.t('preview.yaml.autofix'))}</button>
        ${openBtn}
      </div>
    </div>`;
  }

  export function bind(): void {
    P.$('main')
      .querySelectorAll<HTMLButtonElement>('[data-yaml-act]')
      .forEach(btn => {
        btn.onclick = () => {
          const a = btn.dataset.yamlAct!;
          if (a === 'autofix') {
            if (P.readOnly()) {
              alert(P.t('preview.alert.readOnly'));
              return;
            }
            if (confirm(P.t('preview.confirm.autofix'))) {
              P.vscode.postMessage({ type: 'autofix-frontmatter' });
            }
          } else if (a === 'open-at-line') {
            P.vscode.postMessage({
              type: 'open-at-line',
              line: parseInt(btn.dataset.line || '1', 10),
              column: parseInt(btn.dataset.column || '1', 10)
            });
          }
        };
      });
  }
}
