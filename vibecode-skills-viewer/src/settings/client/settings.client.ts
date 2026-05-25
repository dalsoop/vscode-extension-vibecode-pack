// Settings webview orchestrator. Each top-level menu tab lives in its own
// section file under sections/; this file just wires tab navigation and
// dispatches render/bind to the active section.

interface SectionModule {
  id: string;
  tabKey: string;
  render(): string;
  bind(): void;
}

const SECTIONS: SectionModule[] = [
  LanguageSection,
  SourcesSection,
  ToolsSection,
  ExtraRootsSection,
  SyncSection,
  PreviewSection,
  MirrorsSection,
  RemoteSection,
  FavoritesSection,
  AboutSection
];

function renderTabNav(): string {
  const active = S.activeTab();
  const tabs = SECTIONS.map(
    sec =>
      `<button class="settings-tab ${sec.id === active ? 'active' : ''}" data-settings-tab="${sec.id}">${S.esc(S.t(sec.tabKey))}</button>`
  ).join('');
  return `<nav class="settings-tabs">${tabs}</nav>`;
}

function activeSection(): SectionModule {
  const id = S.activeTab();
  return SECTIONS.find(s => s.id === id) || SECTIONS[0];
}

function render(): void {
  const p = S.payload();
  if (!p) return;
  S.$('version').textContent = S.t('settings.versionLabel', p.extensionVersion);

  // Ensure activeTab is still valid (could have been removed if section list changed).
  if (!SECTIONS.find(s => s.id === S.activeTab())) S.setActiveTab(SECTIONS[0].id);

  const sec = activeSection();
  S.$('main').innerHTML = `
    ${renderTabNav()}
    <div class="settings-content">
      ${sec.render()}
    </div>`;

  // Tab nav click handlers
  document.querySelectorAll<HTMLButtonElement>('[data-settings-tab]').forEach(btn => {
    btn.onclick = () => {
      const next = btn.dataset.settingsTab!;
      if (next === S.activeTab()) return;
      S.setActiveTab(next);
      render();
    };
  });

  // Global boolean switches (used across multiple sections via S.switchEl)
  S.bindSwitches();
  // Section-specific bindings
  sec.bind();
}

window.addEventListener('message', ev => {
  const m = ev.data;
  if (m.type === 'payload') {
    S.setPayload(m.payload);
    render();
  } else if (m.type === 'error') {
    alert(S.t('settings.error.alertPrefix', m.message));
  }
});

S.vscode.postMessage({ type: 'ready' });
