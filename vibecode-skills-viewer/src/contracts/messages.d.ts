declare namespace Contracts {
  // ─── Hub sidebar (src/webview/) ───────────────────────────────────────
  type HubMsgFromExt =
    | {
        type: 'init';
        tabs: Tab[];
        scopes: Segment[];
        tools: Segment[];
        showToolChips: boolean;
        scope: ScopeFilter;
        i18n: WebviewI18n;
      }
    | { type: 'activeFolder'; dir: string | null; label: string | null }
    | { type: 'data'; tab: TabId; items: Group[] };

  type HubMsgFromView =
    | { type: 'setScope'; scope: ScopeFilter }
    | { type: 'refresh' }
    | { type: 'createSkill' }
    | { type: 'action'; action: ActionName; payload: ItemPayload };

  // ─── Preview pane (src/preview/) ──────────────────────────────────────
  type PreviewMsgFromExt =
    | { type: 'payload'; payload: PreviewPayload }
    | { type: 'saved'; payload: PreviewPayload }
    | { type: 'external-change'; payload: PreviewPayload }
    | { type: 'save-error'; error: string };

  type PreviewMsgFromView =
    | { type: 'ready' }
    | { type: 'refresh' }
    | { type: 'open' }
    | { type: 'open-file'; path: string }
    | { type: 'copy-md' }
    | { type: 'copy-path' }
    | { type: 'finder' }
    | { type: 'terminal' }
    | { type: 'editing-start'; sectionId: string }
    | { type: 'editing-stop'; sectionId: string }
    | { type: 'toggle-score-breakdown'; value: boolean }
    | { type: 'save-section'; sectionId: string; content: string; mirror?: boolean }
    | { type: 'quick-fix'; sectionId: string; fix: string }
    | { type: 'autofix-frontmatter' }
    | { type: 'open-at-line'; line: number; column: number }
    | { type: 'mirror-diff'; peer: string }
    | { type: 'mirror-sync-from-here' }
    | { type: 'delete-section'; sectionId: string; confirmed: boolean };

  // ─── Settings panel (src/settings/) ──────────────────────────────────
  type SettingsMsgFromExt =
    | { type: 'payload'; payload: SettingsPayload }
    | { type: 'error'; message: string };

  type SettingsMsgFromView =
    | { type: 'ready' }
    | { type: 'set'; key: keyof CcSkillsConfig; value: unknown }
    | { type: 'clear-favorites' }
    | { type: 'open-vscode-settings' }
    | { type: 'reload-window' }
    | { type: 'mirror-apply-preset'; presetId: string };
}
