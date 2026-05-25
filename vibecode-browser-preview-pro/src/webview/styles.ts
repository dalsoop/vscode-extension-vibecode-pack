export const STYLES = `
  :root { color-scheme: var(--vscode-color-scheme, light dark); }
  html, body { margin: 0; padding: 0; height: 100%; width: 100%; background: var(--vscode-editor-background); color: var(--vscode-foreground); font-family: var(--vscode-font-family); }
  body { display: flex; flex-direction: column; }
  .toolbar { display: flex; align-items: center; gap: 6px; padding: 6px 10px; background: var(--vscode-titleBar-activeBackground, var(--vscode-editorWidget-background)); border-bottom: 1px solid var(--vscode-panel-border, transparent); height: 36px; box-sizing: border-box; flex: 0 0 auto; }
  .toolbar button { background: var(--vscode-button-secondaryBackground, transparent); color: var(--vscode-button-secondaryForeground, var(--vscode-foreground)); border: 1px solid var(--vscode-button-border, transparent); padding: 4px 10px; font: inherit; font-size: 12px; cursor: pointer; border-radius: 3px; }
  .toolbar button:hover { background: var(--vscode-button-secondaryHoverBackground, var(--vscode-list-hoverBackground)); }
  .url { font-size: 11px; color: var(--vscode-descriptionForeground); margin-left: auto; user-select: text; }
  .frame-wrap { flex: 1 1 auto; min-height: 0; position: relative; background: white; }
  iframe { border: 0; width: 100%; height: 100%; display: block; }
  .overlay { position: absolute; inset: 0; display: none; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 24px; text-align: center; background: var(--vscode-editor-background); color: var(--vscode-foreground); }
  .overlay.visible { display: flex; }
  .overlay h2 { margin: 0; font-size: 14px; font-weight: 600; }
  .overlay p { margin: 0; font-size: 12px; color: var(--vscode-descriptionForeground); max-width: 480px; }
`;
