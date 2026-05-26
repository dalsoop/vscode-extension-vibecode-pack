
export const STYLES = `
:root { color-scheme: light dark; }
* { box-sizing: border-box; }
body {
  font-family: var(--vscode-font-family);
  font-size: var(--vscode-font-size);
  color: var(--vscode-foreground);
  background: var(--vscode-editor-background);
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.viewer {
  flex: 1 1 60%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-bottom: 1px solid var(--vscode-panel-border, rgba(127,127,127,0.2));
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-bottom: 1px solid var(--vscode-panel-border, rgba(127,127,127,0.2));
  font-size: 0.85em;
  flex-wrap: wrap;
}
.toolbar .filename {
  font-family: var(--vscode-editor-font-family);
  font-weight: 600;
}
.toolbar .dim {
  color: var(--vscode-descriptionForeground);
  font-family: var(--vscode-editor-font-family);
}
.toolbar .spacer { flex: 1; }
.zoom-group, .bg-group { display: flex; align-items: center; gap: 4px; }
.bg-group { margin-left: 8px; }
.bg-group > span { color: var(--vscode-descriptionForeground); margin-right: 2px; }
.zoom-pct {
  font-family: var(--vscode-editor-font-family);
  color: var(--vscode-descriptionForeground);
  min-width: 3.5em;
  text-align: right;
}

button {
  background: transparent;
  color: var(--vscode-foreground);
  border: 1px solid var(--vscode-button-border, var(--vscode-panel-border));
  padding: 2px 8px;
  cursor: pointer;
  border-radius: 2px;
  font-size: 0.85em;
  white-space: nowrap;
  font-family: var(--vscode-font-family);
}
button:hover:not(:disabled) { background: var(--vscode-toolbar-hoverBackground); }
button:disabled { opacity: 0.5; cursor: not-allowed; }
button.active {
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  border-color: var(--vscode-button-background);
}
button.link {
  background: transparent;
  border: none;
  color: var(--vscode-textLink-foreground);
  padding: 0;
  text-decoration: underline;
  cursor: pointer;
}

.stage {
  flex: 1 1 auto;
  min-height: 0;
  position: relative;
  overflow: auto;
  background-image:
    linear-gradient(45deg, rgba(127,127,127,0.15) 25%, transparent 25%),
    linear-gradient(-45deg, rgba(127,127,127,0.15) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, rgba(127,127,127,0.15) 75%),
    linear-gradient(-45deg, transparent 75%, rgba(127,127,127,0.15) 75%);
  background-size: 20px 20px;
  background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
}
.stage.bg-dark {
  background: #111;
}
.stage.bg-light {
  background: #f6f6f6;
}
.stage-inner {
  min-width: 100%;
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}
#image {
  display: block;
  max-width: none;
  user-select: none;
  -webkit-user-drag: none;
  image-rendering: auto;
}
#image.fit {
  max-width: calc(100vw - 64px);
  max-height: calc(60vh - 64px);
}

.placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--vscode-descriptionForeground);
  background: var(--vscode-editor-background);
}
.placeholder-icon { font-size: 3em; opacity: 0.4; }
.placeholder-text { margin-top: 8px; font-size: 0.9em; text-align: center; padding: 0 24px; max-width: 480px; }

.meta-panel {
  flex: 0 0 auto;
  max-height: 40vh;
  overflow-y: auto;
  padding: 12px 16px;
  background: var(--vscode-sideBar-background, var(--vscode-editor-background));
}

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 10px;
  margin-bottom: 12px;
}
.card {
  border: 1px solid var(--vscode-panel-border, rgba(127,127,127,0.2));
  border-radius: 4px;
  padding: 10px 12px;
  background: var(--vscode-editor-background);
}
.card h3 {
  margin: 0 0 6px;
  font-size: 0.78em;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--vscode-descriptionForeground);
  font-weight: 600;
}
.card dl {
  margin: 0;
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 2px 12px;
  font-size: 0.85em;
}
.card dt {
  color: var(--vscode-descriptionForeground);
  font-family: var(--vscode-editor-font-family);
}
.card dd {
  margin: 0;
  font-family: var(--vscode-editor-font-family);
  word-break: break-all;
}
.card .row-actions {
  margin-top: 8px;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.raw-section { margin-top: 8px; }
.raw-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}
.raw-header h3 {
  margin: 0;
  font-size: 0.78em;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--vscode-descriptionForeground);
  font-weight: 600;
}
.raw-actions { display: flex; gap: 6px; }
.raw-body {
  background: var(--vscode-textBlockQuote-background, rgba(127,127,127,0.08));
  border: 1px solid var(--vscode-panel-border, rgba(127,127,127,0.2));
  border-radius: 4px;
  padding: 10px 12px;
  font-family: var(--vscode-editor-font-family);
  font-size: 0.8em;
  max-height: 280px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
}
.raw-empty {
  color: var(--vscode-descriptionForeground);
  font-size: 0.85em;
  padding: 8px 0;
}

.footer-actions {
  margin-top: 12px;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  border-top: 1px solid var(--vscode-panel-border, rgba(127,127,127,0.2));
  padding-top: 10px;
}

.toast {
  position: fixed;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--vscode-notifications-background, var(--vscode-editorWidget-background));
  color: var(--vscode-notifications-foreground, var(--vscode-foreground));
  border: 1px solid var(--vscode-notifications-border, var(--vscode-panel-border));
  border-radius: 4px;
  padding: 6px 12px;
  font-size: 0.85em;
  opacity: 0;
  transition: opacity 0.2s;
  pointer-events: none;
  z-index: 100;
}
.toast.visible { opacity: 1; }
`;
