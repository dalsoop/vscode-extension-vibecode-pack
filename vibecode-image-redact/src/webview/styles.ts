export const STYLES = `
:root { color-scheme: light dark; }
* { box-sizing: border-box; }
body, html {
  margin: 0; padding: 0;
  height: 100vh;
  font-family: var(--vscode-font-family);
  font-size: var(--vscode-font-size);
  color: var(--vscode-foreground);
  background: var(--vscode-editor-background);
  overflow: hidden;
}
.root { display: flex; flex-direction: column; height: 100vh; }

.topbar {
  display: flex;
  align-items: center;
  padding: 8px 14px;
  border-bottom: 1px solid var(--vscode-panel-border, rgba(127,127,127,0.2));
  flex-shrink: 0;
}
h1#filename {
  font-size: 0.95em;
  margin: 0;
  font-family: var(--vscode-editor-font-family);
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.main { flex: 1; display: flex; min-height: 0; }
.stage {
  flex: 1;
  position: relative;
  overflow: auto;
  background-image:
    linear-gradient(45deg, rgba(127,127,127,0.18) 25%, transparent 25%),
    linear-gradient(-45deg, rgba(127,127,127,0.18) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, rgba(127,127,127,0.18) 75%),
    linear-gradient(-45deg, transparent 75%, rgba(127,127,127,0.18) 75%);
  background-size: 20px 20px;
  background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
  padding: 16px;
}
#canvas-display {
  display: block;
  max-width: 100%;
  height: auto;
  user-select: none;
  cursor: crosshair;
}
.selection-box {
  position: absolute;
  border: 1px dashed var(--vscode-focusBorder, #4ea1ff);
  background: rgba(78, 161, 255, 0.12);
  pointer-events: none;
}
.loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--vscode-descriptionForeground);
  background: var(--vscode-editor-background);
}
.loading.hidden { display: none; }

.side {
  width: 320px;
  flex-shrink: 0;
  border-left: 1px solid var(--vscode-panel-border, rgba(127,127,127,0.2));
  background: var(--vscode-sideBar-background, var(--vscode-editor-background));
  overflow-y: auto;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.hint {
  font-size: 12px;
  color: var(--vscode-descriptionForeground);
  margin: 0;
  line-height: 1.4;
}

.form { display: flex; flex-direction: column; gap: 12px; }
.form-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
}
.form-row > span:first-child { color: var(--vscode-descriptionForeground); }
.form-row.slider { gap: 4px; }
.form-row.slider input[type="range"] { width: 100%; }
.form-row.slider output {
  font-family: var(--vscode-editor-font-family);
  font-size: 11px;
  align-self: flex-end;
  color: var(--vscode-descriptionForeground);
}

.seg {
  display: flex;
  gap: 0;
  border: 1px solid var(--vscode-button-border, var(--vscode-panel-border));
  border-radius: 3px;
  overflow: hidden;
}
.seg-item {
  flex: 1;
  background: transparent;
  border: none;
  border-right: 1px solid var(--vscode-button-border, var(--vscode-panel-border));
  color: var(--vscode-foreground);
  padding: 4px 8px;
  font-family: inherit;
  font-size: 11px;
  cursor: pointer;
}
.seg-item:last-child { border-right: none; }
.seg-item:hover { background: var(--vscode-toolbar-hoverBackground); }
.seg-item.active {
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
}

.input-cluster { display: flex; gap: 6px; align-items: center; }
.swatch {
  width: 28px; height: 28px;
  border: 1px solid var(--vscode-panel-border, rgba(127,127,127,0.4));
  border-radius: 4px;
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
  background-image:
    linear-gradient(45deg, rgba(127,127,127,0.25) 25%, transparent 25%),
    linear-gradient(-45deg, rgba(127,127,127,0.25) 25%, transparent 25%);
  background-size: 8px 8px;
}
.swatch::after {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--swatch-color, transparent);
}
.swatch.small { width: 24px; height: 24px; }
.input-cluster input[type="text"] {
  flex: 1;
  background: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  border: 1px solid var(--vscode-input-border, transparent);
  border-radius: 3px;
  padding: 4px 8px;
  font-family: var(--vscode-editor-font-family);
  font-size: 12px;
}

.regions-section { flex: 1; min-height: 0; display: flex; flex-direction: column; }
.regions-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}
.regions-head h3 {
  margin: 0;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--vscode-descriptionForeground);
}
.ghost-btn {
  background: transparent;
  border: 1px solid var(--vscode-button-border, var(--vscode-panel-border));
  color: var(--vscode-foreground);
  padding: 2px 8px;
  font-size: 10px;
  border-radius: 3px;
  cursor: pointer;
  font-family: inherit;
}
.ghost-btn:hover { background: var(--vscode-toolbar-hoverBackground); }
.region-list {
  list-style: none;
  padding: 0;
  margin: 0;
  overflow-y: auto;
  max-height: 240px;
}
.region-list li {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px;
  font-size: 11px;
  border-bottom: 1px solid var(--vscode-panel-border, rgba(127,127,127,0.2));
}
.region-list .region-tag {
  flex: 1;
  font-family: var(--vscode-editor-font-family);
}
.region-list .region-coord { color: var(--vscode-descriptionForeground); }
.region-list .remove-x {
  background: transparent;
  border: none;
  color: var(--vscode-errorForeground);
  cursor: pointer;
  padding: 0 6px;
  font-size: 14px;
  line-height: 1;
}
.region-list .empty {
  color: var(--vscode-descriptionForeground);
  font-style: italic;
  padding: 8px 6px;
  text-align: center;
}

.action-row {
  display: flex;
  gap: 6px;
  justify-content: flex-end;
}
.action-row button {
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  border: 1px solid var(--vscode-button-background);
  padding: 4px 14px;
  font-family: inherit;
  font-size: 12px;
  border-radius: 3px;
  cursor: pointer;
}
.action-row button.primary:hover:not(:disabled) {
  background: var(--vscode-button-hoverBackground);
}
.action-row button:disabled { opacity: 0.4; cursor: not-allowed; }
`;
