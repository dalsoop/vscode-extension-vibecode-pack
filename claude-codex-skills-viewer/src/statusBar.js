const vscode = require('vscode');
const { collectAllSkills } = require('./sources');

let item = null;

function refresh() {
  if (!item) return;
  const all = collectAllSkills({});
  const ws = all.filter(x => x.source.scope === 'workspace').length;
  const total = all.length;
  item.text = `$(book) ${total}${ws ? ` · ws ${ws}` : ''}`;
  item.tooltip = `Claude & Codex Skills: ${total} installed${ws ? ` (${ws} in workspace)` : ''} — click to filter`;
  item.command = 'claudeCodexSkills.search';
}

function activate(context) {
  item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 80);
  context.subscriptions.push(item);
  refresh();
  item.show();
}

module.exports = { activate, refresh };
