export const STYLES = `
:root { color-scheme: light dark; }
* { box-sizing: border-box; }
body, html {
  margin: 0;
  padding: 0;
  height: 100vh;
  font-family: var(--vscode-font-family);
  font-size: var(--vscode-font-size);
  color: var(--vscode-foreground);
  background: var(--vscode-editor-background);
  overflow: hidden;
}
.root {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.topbar {
  display: flex;
  align-items: center;
  gap: 16px;
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
.tabs { display: flex; gap: 4px; margin-left: auto; }
.tab {
  background: transparent;
  border: 1px solid var(--vscode-button-border, var(--vscode-panel-border));
  color: var(--vscode-foreground);
  padding: 4px 12px;
  font-family: inherit;
  font-size: 12px;
  border-radius: 3px;
  cursor: pointer;
}
.tab:hover { background: var(--vscode-toolbar-hoverBackground); }
.tab.active {
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  border-color: var(--vscode-button-background);
}

.main {
  flex: 1;
  display: flex;
  min-height: 0;
}
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
  pointer-events: none;
}
.loading.hidden { display: none; }

.side {
  width: 320px;
  flex-shrink: 0;
  border-left: 1px solid var(--vscode-panel-border, rgba(127,127,127,0.2));
  background: var(--vscode-sideBar-background, var(--vscode-editor-background));
  overflow-y: auto;
}
.panel { padding: 14px; }
.hint {
  font-size: 12px;
  color: var(--vscode-descriptionForeground);
  margin: 0 0 12px;
  line-height: 1.4;
}

.swatch-row { display: flex; gap: 12px; align-items: center; }
.swatch {
  width: 64px;
  height: 64px;
  border: 1px solid var(--vscode-panel-border, rgba(127,127,127,0.4));
  border-radius: 4px;
  background: #00000000;
  background-image:
    linear-gradient(45deg, rgba(127,127,127,0.25) 25%, transparent 25%),
    linear-gradient(-45deg, rgba(127,127,127,0.25) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, rgba(127,127,127,0.25) 75%),
    linear-gradient(-45deg, transparent 75%, rgba(127,127,127,0.25) 75%);
  background-size: 12px 12px;
  background-position: 0 0, 0 6px, 6px -6px, -6px 0px;
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
}
.swatch::after {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--swatch-color, transparent);
}
.swatch.small { width: 24px; height: 24px; }

.readout { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 0; }
.readout-row { display: flex; align-items: center; gap: 6px; font-size: 12px; }
.readout-key {
  color: var(--vscode-descriptionForeground);
  width: 36px;
  flex-shrink: 0;
}
.readout-val {
  flex: 1;
  font-family: var(--vscode-editor-font-family);
  font-size: 11px;
  background: var(--vscode-textBlockQuote-background, rgba(127,127,127,0.1));
  padding: 2px 6px;
  border-radius: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.copy-btn {
  background: transparent;
  border: 1px solid var(--vscode-button-border, var(--vscode-panel-border));
  color: var(--vscode-foreground);
  padding: 1px 6px;
  font-size: 10px;
  border-radius: 2px;
  cursor: pointer;
}
.copy-btn::before { content: '⧉'; }
.copy-btn:hover { background: var(--vscode-toolbar-hoverBackground); }

.form-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
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

.input-cluster { display: flex; gap: 6px; align-items: center; }
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
.input-cluster input:focus { outline: 1px solid var(--vscode-focusBorder); }
.input-cluster button {
  background: transparent;
  border: 1px solid var(--vscode-button-border, var(--vscode-panel-border));
  color: var(--vscode-foreground);
  padding: 4px 10px;
  font-family: inherit;
  font-size: 12px;
  border-radius: 3px;
  cursor: pointer;
  white-space: nowrap;
}
.input-cluster button:hover { background: var(--vscode-toolbar-hoverBackground); }
.input-cluster button.active {
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  border-color: var(--vscode-button-background);
}

.action-row {
  display: flex;
  gap: 6px;
  justify-content: flex-end;
  margin-top: 8px;
}
.action-row button {
  background: transparent;
  border: 1px solid var(--vscode-button-border, var(--vscode-panel-border));
  color: var(--vscode-foreground);
  padding: 4px 14px;
  font-family: inherit;
  font-size: 12px;
  border-radius: 3px;
  cursor: pointer;
}
.action-row button:hover:not(:disabled) { background: var(--vscode-toolbar-hoverBackground); }
.action-row button:disabled { opacity: 0.4; cursor: not-allowed; }
.action-row button.primary {
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  border-color: var(--vscode-button-background);
}
.action-row button.primary:hover:not(:disabled) { background: var(--vscode-button-hoverBackground); }

.crop-status {
  font-family: var(--vscode-editor-font-family);
  font-size: 12px;
  color: var(--vscode-descriptionForeground);
  padding: 8px;
  background: var(--vscode-textBlockQuote-background, rgba(127,127,127,0.08));
  border-radius: 3px;
  text-align: center;
  margin-bottom: 8px;
}

.toast {
  position: fixed;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--vscode-notifications-background, var(--vscode-editorWidget-background));
  color: var(--vscode-notifications-foreground, var(--vscode-foreground));
  border: 1px solid var(--vscode-notifications-border, var(--vscode-panel-border));
  padding: 6px 14px;
  border-radius: 4px;
  font-size: 12px;
  opacity: 0;
  transition: opacity 0.2s;
  pointer-events: none;
  z-index: 100;
}
.toast.visible { opacity: 1; }

.stage.picking #canvas-display { cursor: crosshair; }
.stage.crop-mode #canvas-display { cursor: crosshair; }
`;
