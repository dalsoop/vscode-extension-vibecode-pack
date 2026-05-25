export const STYLES = `
  :root { color-scheme: var(--vscode-color-scheme, light dark); }
  html, body { margin: 0; padding: 0; height: 100%; width: 100%; background: var(--vscode-editor-background); color: var(--vscode-foreground); font-family: var(--vscode-font-family); }
  body { display: flex; flex-direction: column; }
  .toolbar { display: flex; align-items: center; gap: 6px; padding: 6px 10px; background: var(--vscode-titleBar-activeBackground, var(--vscode-editorWidget-background)); border-bottom: 1px solid var(--vscode-panel-border, transparent); height: 36px; box-sizing: border-box; flex: 0 0 auto; }
  .toolbar button { background: var(--vscode-button-secondaryBackground, transparent); color: var(--vscode-button-secondaryForeground, var(--vscode-foreground)); border: 1px solid var(--vscode-button-border, transparent); padding: 4px 10px; font: inherit; font-size: 12px; cursor: pointer; border-radius: 3px; }
  .toolbar button:hover { background: var(--vscode-button-secondaryHoverBackground, var(--vscode-list-hoverBackground)); }
  .toolbar button.active { background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
  .url { font-size: 11px; color: var(--vscode-descriptionForeground); margin-left: auto; user-select: text; flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  .main { flex: 1 1 auto; min-height: 0; display: flex; }
  .frame-wrap { flex: 1 1 auto; min-width: 0; position: relative; background: white; }
  .device-frame { width: 100%; height: 100%; }
  .device-frame[data-mode="auto"] iframe { width: 100%; height: 100%; border: 0; display: block; }
  .device-frame[data-mode="desktop"], .device-frame[data-mode="tablet"], .device-frame[data-mode="mobile"] {
    display: flex; align-items: stretch; justify-content: center;
    background: var(--vscode-editorWidget-background, #2a2a2a);
  }
  .device-frame[data-mode="desktop"] iframe { width: 1280px; height: 100%; border: 0; display: block; background: white; }
  .device-frame[data-mode="tablet"]  iframe { width:  768px; height: 100%; border: 0; display: block; background: white; }
  .device-frame[data-mode="mobile"]  iframe { width:  375px; height: 100%; border: 0; display: block; background: white; }
  .device-label { font-size: 11px; color: var(--vscode-descriptionForeground); display: inline-flex; align-items: center; gap: 4px; flex: 0 0 auto; margin-left: 8px; }
  .device-label select { font: inherit; font-size: 11px; background: var(--vscode-dropdown-background, var(--vscode-input-background)); color: var(--vscode-dropdown-foreground, var(--vscode-input-foreground)); border: 1px solid var(--vscode-dropdown-border, transparent); border-radius: 3px; padding: 2px 4px; }
  .overlay { position: absolute; inset: 0; display: none; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 24px; text-align: center; background: var(--vscode-editor-background); color: var(--vscode-foreground); }
  .overlay.visible { display: flex; }
  .overlay h2 { margin: 0; font-size: 14px; font-weight: 600; }
  .overlay p { margin: 0; font-size: 12px; color: var(--vscode-descriptionForeground); max-width: 480px; }

  .panel { display: none; flex: 0 0 320px; min-width: 240px; max-width: 600px; border-left: 1px solid var(--vscode-panel-border, transparent); background: var(--vscode-sideBar-background, var(--vscode-editor-background)); color: var(--vscode-sideBar-foreground, var(--vscode-foreground)); overflow: auto; font-size: 12px; flex-direction: column; }
  .panel.visible { display: flex; }
  .panel-section { padding: 8px 10px; border-bottom: 1px solid var(--vscode-panel-border, transparent); }
  .panel-section h3 { margin: 0 0 6px 0; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: var(--vscode-descriptionForeground); }
  .panel-empty { font-size: 11px; color: var(--vscode-descriptionForeground); font-style: italic; }
  .pin-card { background: var(--vscode-editor-background); border: 1px solid var(--vscode-panel-border, transparent); border-radius: 4px; padding: 8px; margin-bottom: 8px; }
  .pin-header { display: flex; justify-content: space-between; align-items: center; gap: 6px; margin-bottom: 6px; }
  .pin-badge { display: inline-flex; align-items: center; gap: 2px; font-size: 10px; padding: 1px 5px; border-radius: 10px; background: var(--vscode-badge-background, rgba(127,127,127,0.2)); color: var(--vscode-badge-foreground, var(--vscode-foreground)); margin-right: 6px; }
  .pin-badge.zero { opacity: 0.4; }
  .pin-selector { font-family: var(--vscode-editor-font-family, monospace); font-size: 11px; word-break: break-all; flex: 1 1 auto; }
  .pin-actions button { font-size: 11px; padding: 2px 6px; }
  .pin-block { margin-top: 6px; }
  .pin-block label { display: block; font-size: 10px; text-transform: uppercase; color: var(--vscode-descriptionForeground); margin-bottom: 3px; letter-spacing: 0.04em; }
  .pin-rules { font-family: var(--vscode-editor-font-family, monospace); font-size: 11px; max-height: 100px; overflow: auto; background: var(--vscode-textBlockQuote-background, var(--vscode-editor-background)); padding: 4px 6px; border-radius: 3px; }
  .pin-rule { padding: 2px 0; }
  .pin-computed { display: grid; grid-template-columns: max-content 1fr; gap: 2px 8px; font-family: var(--vscode-editor-font-family, monospace); font-size: 11px; }
  .pin-computed .k { color: var(--vscode-descriptionForeground); }
  .pin-overrides input[type=text], .pin-overrides textarea, .pin-overrides select { width: 100%; box-sizing: border-box; font: inherit; font-family: var(--vscode-editor-font-family, monospace); font-size: 11px; padding: 3px 5px; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border, transparent); border-radius: 3px; }
  .pin-overrides textarea { resize: vertical; min-height: 38px; }
  .pin-overrides .notes-ta { min-height: 32px; }
  .pin-overrides .toggles label { display: inline-flex; align-items: center; gap: 4px; margin-right: 8px; font-size: 11px; text-transform: none; color: inherit; }
  .asset-row { display: flex; gap: 6px; font-family: var(--vscode-editor-font-family, monospace); font-size: 11px; padding: 2px 0; }
  .asset-row .type { width: 56px; color: var(--vscode-descriptionForeground); text-transform: uppercase; font-size: 10px; }
  .asset-row .path { flex: 1 1 auto; word-break: break-all; }

  .toast { position: absolute; left: 50%; bottom: 16px; transform: translateX(-50%); background: var(--vscode-notifications-background, #1f1f1f); color: var(--vscode-notifications-foreground, #fff); padding: 6px 12px; border-radius: 4px; font-size: 12px; display: none; z-index: 1000; }
  .toast.visible { display: flex; align-items: center; gap: 8px; }
  .toast button { font-size: 11px; padding: 2px 6px; }

  .panel-tabs { display: flex; border-bottom: 1px solid var(--vscode-panel-border, transparent); background: var(--vscode-editorWidget-background, var(--vscode-editor-background)); }
  .panel-tab { flex: 1 1 auto; background: transparent; border: 0; padding: 6px 8px; font: inherit; font-size: 11px; cursor: pointer; color: var(--vscode-descriptionForeground); display: flex; align-items: center; justify-content: center; gap: 4px; border-bottom: 2px solid transparent; }
  .panel-tab:hover { background: var(--vscode-list-hoverBackground, transparent); }
  .panel-tab.active { color: var(--vscode-foreground); border-bottom-color: var(--vscode-focusBorder, var(--vscode-button-background)); }
  .panel-tab .tab-count { font-size: 10px; padding: 0 5px; border-radius: 8px; background: var(--vscode-badge-background, rgba(127,127,127,0.2)); color: var(--vscode-badge-foreground, var(--vscode-foreground)); }
  .panel-tab .tab-count.zero { opacity: 0.45; }
  .tab-panel { padding: 8px 10px; border-bottom: 1px solid var(--vscode-panel-border, transparent); }
  .tab-panel[hidden] { display: none; }
  .panel-warning { padding: 6px 10px; font-size: 11px; color: var(--vscode-editorWarning-foreground, var(--vscode-descriptionForeground)); background: var(--vscode-inputValidation-warningBackground, transparent); border-bottom: 1px solid var(--vscode-editorWarning-border, var(--vscode-panel-border, transparent)); }
  .panel-warning[hidden] { display: none; }

  .diff-card { background: var(--vscode-editor-background); border: 1px solid var(--vscode-panel-border, transparent); border-radius: 4px; padding: 6px 8px; margin-bottom: 6px; font-size: 11px; }
  .diff-head { display: flex; align-items: baseline; gap: 6px; margin-bottom: 4px; }
  .diff-id { font-family: var(--vscode-editor-font-family, monospace); color: var(--vscode-descriptionForeground); font-size: 10px; }
  .diff-sel { font-family: var(--vscode-editor-font-family, monospace); font-size: 11px; word-break: break-all; flex: 1 1 auto; color: var(--vscode-textLink-foreground, var(--vscode-foreground)); text-decoration: none; }
  .diff-sel:hover { text-decoration: underline; }
  .diff-row { display: grid; grid-template-columns: 110px 1fr; gap: 4px 8px; margin-top: 3px; font-family: var(--vscode-editor-font-family, monospace); font-size: 11px; }
  .diff-k { color: var(--vscode-descriptionForeground); font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; }
  .diff-v { word-break: break-all; }
  .diff-notes-body { white-space: pre-wrap; font-family: inherit; }

  .force-chips { display: flex; gap: 4px; margin-top: 2px; overflow-x: auto; }
  .force-chip { background: transparent; color: inherit; border: 1px solid var(--vscode-button-border, var(--vscode-input-border, transparent)); border-radius: 3px; padding: 2px 6px; font: inherit; font-size: 11px; font-family: var(--vscode-editor-font-family, monospace); cursor: pointer; flex: 0 0 auto; }
  .force-chip:hover { background: var(--vscode-list-hoverBackground, transparent); }
  .force-chip[aria-pressed="true"] { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border-color: var(--vscode-button-background); }

  .panel-warning { display: flex; align-items: center; gap: 6px; }
  .panel-warning #panel-warning-text { flex: 1 1 auto; min-width: 0; }
  .panel-warning-close { flex: 0 0 auto; background: transparent; border: 0; padding: 2px 4px; color: inherit; cursor: pointer; border-radius: 3px; }
  .panel-warning-close:hover { background: var(--vscode-list-hoverBackground, transparent); }

  .panel-footer { padding: 6px 10px; border-top: 1px solid var(--vscode-panel-border, transparent); margin-top: auto; }
  .panel-footer-hint { margin: 0; font-size: 11px; color: var(--vscode-descriptionForeground); font-style: italic; text-align: center; }

  .codicon { font-size: 14px; vertical-align: -2px; color: inherit; line-height: 1; }
  .toolbar .codicon { font-size: 14px; margin-right: 4px; }
  .pin-actions .codicon { font-size: 13px; }
`;
