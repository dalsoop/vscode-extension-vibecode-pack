// Preview webview orchestrator. Each region of the panel lives in its own
// section file under sections/; this file wires them up and routes messages.
//
// The reference directives below force TypeScript's outFile emit order so
// that all section namespaces are *defined* before this orchestrator runs.
// Without them, glob ordering can put the orchestrator ahead of sections,
// and the dispatch calls below would hit `undefined` IIFE values (var
// hoisting only) — silent crash before render. See settings.client.ts for
// the same fix.

/// <reference path="./_shared.ts" />
/// <reference path="./sections/aux.ts" />
/// <reference path="./sections/code-copy.ts" />
/// <reference path="./sections/frontmatter-form.ts" />
/// <reference path="./sections/header.ts" />
/// <reference path="./sections/skill-section.ts" />
/// <reference path="./sections/toc.ts" />
/// <reference path="./sections/yaml-error.ts" />

function render(): void {
  const p = P.payload();
  if (!p) return;

  HeaderSection.render();

  const main = P.$('main');
  main.innerHTML = `
    ${YamlErrorSection.render()}
    <div class="layout">
      <div class="content">
        ${[...p.sections.map(SkillSection.render), AuxSection.render()].join('')}
      </div>
      ${TocSection.render()}
    </div>`;

  // Section action dispatch (edit, delete, save, toggle-rules, quick-fix, …)
  main.querySelectorAll<HTMLButtonElement>('[data-sect-act]').forEach(btn => {
    btn.onclick = () => SkillSection.handleAction(btn.dataset.sectAct!, btn.dataset.id!, btn.dataset.fix);
  });

  AuxSection.bind();
  YamlErrorSection.bind();
  CodeCopy.inject();
  FrontmatterForm.bindCounters();
  TocSection.bind();
}

// Let any section trigger a re-render after mutating UI-only state (e.g. when
// the user toggles the rule breakdown or enters delete-confirm mode).
P.setRerender(render);

window.addEventListener('message', ev => {
  const m = ev.data;
  if (m.type === 'payload' || m.type === 'saved') {
    P.setPayload(m.payload);
    if (m.type === 'saved') P.setExternalDirty(false);
    render();
  } else if (m.type === 'save-error') {
    alert(P.t('preview.alert.saveFailed', m.error));
  } else if (m.type === 'external-change') {
    P.setExternalDirty(true);
    render();
    if (!confirm(P.t('preview.confirm.externalChange'))) return;
    P.editing.clear();
    P.vscode.postMessage({ type: 'refresh' });
  }
});

P.vscode.postMessage({ type: 'ready' });
