// CSS for the env-import webview. Uses VSCode CSS variables so themes apply automatically.
// Kept as a single template literal for easy injection into the HTML <style> tag.

export const STYLES = `
:root { color-scheme: light dark; }
body {
  font-family: var(--vscode-font-family);
  font-size: var(--vscode-font-size);
  color: var(--vscode-foreground);
  background: var(--vscode-editor-background);
  padding: 16px 20px;
  margin: 0;
}
h1 { font-size: 1.1em; margin: 0 0 4px; }
h2 {
  font-size: 0.95em;
  margin: 20px 0 8px;
  color: var(--vscode-descriptionForeground);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.filename {
  color: var(--vscode-descriptionForeground);
  font-family: var(--vscode-editor-font-family);
  font-size: 0.9em;
}
.hint, .save-hint, .error {
  font-size: 0.85em;
  margin: 8px 0 16px;
  line-height: 1.4;
}
.hint, .save-hint { color: var(--vscode-descriptionForeground); }
.save-hint { margin: 16px 0 0; }
.error {
  color: var(--vscode-errorForeground);
  background: var(--vscode-inputValidation-errorBackground, transparent);
  border: 1px solid var(--vscode-inputValidation-errorBorder, var(--vscode-errorForeground));
  padding: 6px 10px;
  border-radius: 2px;
  display: none;
}
.error.visible { display: block; }

.row {
  display: grid;
  grid-template-columns: minmax(160px, 1fr) minmax(200px, 2fr) auto auto auto auto;
  gap: 8px;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--vscode-panel-border, rgba(127,127,127,0.2));
}
.add-row {
  display: grid;
  grid-template-columns: minmax(160px, 1fr) minmax(200px, 2fr) auto;
  gap: 8px;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--vscode-panel-border, rgba(127,127,127,0.2));
}
.key {
  font-family: var(--vscode-editor-font-family);
  font-weight: 600;
  word-break: break-all;
}
.status {
  font-family: var(--vscode-editor-font-family);
  color: var(--vscode-descriptionForeground);
  font-size: 0.9em;
  white-space: nowrap;
}
.status.set { color: var(--vscode-charts-green, var(--vscode-foreground)); }
.status.empty {
  color: var(--vscode-disabledForeground, var(--vscode-descriptionForeground));
  font-style: italic;
}

input {
  background: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  border: 1px solid var(--vscode-input-border, transparent);
  padding: 4px 8px;
  font-family: var(--vscode-editor-font-family);
  font-size: 1em;
  border-radius: 2px;
  width: 100%;
  box-sizing: border-box;
}
input:focus { outline: 1px solid var(--vscode-focusBorder); outline-offset: -1px; }
input.invalid {
  outline: 1px solid var(--vscode-inputValidation-errorBorder, var(--vscode-errorForeground));
  outline-offset: -1px;
}

button {
  background: transparent;
  color: var(--vscode-foreground);
  border: 1px solid var(--vscode-button-border, var(--vscode-panel-border));
  padding: 3px 10px;
  cursor: pointer;
  border-radius: 2px;
  font-size: 0.85em;
  white-space: nowrap;
}
button:hover:not(:disabled) { background: var(--vscode-toolbar-hoverBackground); }
button:disabled { opacity: 0.5; cursor: not-allowed; }
button.primary {
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  border-color: var(--vscode-button-background);
}
button.primary:hover:not(:disabled) { background: var(--vscode-button-hoverBackground); }
button.danger { color: var(--vscode-errorForeground); }

.key-edit { display: flex; gap: 4px; align-items: center; }
.key-edit input { font-weight: 600; }
`;
