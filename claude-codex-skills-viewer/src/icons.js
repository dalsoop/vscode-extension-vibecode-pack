const vscode = require('vscode');
const path = require('path');

let extRoot = null;
function init(extensionPath) { extRoot = extensionPath; }

function iconPath(rel) {
  if (!extRoot) return new vscode.ThemeIcon('symbol-method');
  const p = path.join(extRoot, 'icons', rel);
  return { light: vscode.Uri.file(p), dark: vscode.Uri.file(p) };
}

// Semantic icon registry: drawn SVGs + fallback to ThemeIcon when we didn't draw one.
const REG = {
  // tools
  'tool.claude':   () => iconPath('tools/claude.svg'),
  'tool.codex':    () => iconPath('tools/codex.svg'),
  'tool.copilot':  () => iconPath('tools/copilot.svg'),
  'tool.cursor':   () => iconPath('tools/cursor.svg'),
  'tool.windsurf': () => iconPath('tools/windsurf.svg'),
  'tool.cline':    () => iconPath('tools/cline.svg'),
  'tool.agents':   () => iconPath('tools/agents.svg'),
  'tool.custom':   () => iconPath('tools/custom.svg'),
  'tool.extension':() => iconPath('scope/extension.svg'),

  // scope
  'scope.global':    () => iconPath('scope/global.svg'),
  'scope.workspace': () => iconPath('scope/workspace.svg'),
  'scope.extension': () => iconPath('scope/extension.svg'),

  // tier
  'tier.official':  () => iconPath('tier/official.svg'),
  'tier.curated':   () => iconPath('tier/curated.svg'),
  'tier.community': () => iconPath('tier/community.svg'),

  // state
  'state.new':              () => iconPath('state/new.svg'),
  'state.favorite-filled':  () => iconPath('state/favorite-filled.svg'),
  'state.favorite-outline': () => iconPath('state/favorite-outline.svg'),
  'state.readonly':         () => iconPath('state/readonly.svg'),
  'state.has-md':           () => iconPath('state/has-md.svg'),
  'state.no-md':            () => iconPath('state/no-md.svg'),

  // actions (drew install/uninstall/refresh/pin)
  'action.install':   () => iconPath('actions/install.svg'),
  'action.uninstall': () => iconPath('actions/uninstall.svg'),
  'action.refresh':   () => iconPath('actions/refresh.svg'),
  'action.pin':       () => iconPath('actions/pin.svg'),
  // fallbacks for not-yet-drawn
  'action.unpin':     () => new vscode.ThemeIcon('pinned'),
  'action.preview':   () => new vscode.ThemeIcon('preview'),
  'action.terminal':  () => new vscode.ThemeIcon('terminal'),
  'action.copy':      () => new vscode.ThemeIcon('copy'),
  'action.reveal':    () => new vscode.ThemeIcon('folder-opened'),
  'action.search':    () => new vscode.ThemeIcon('search'),
  'action.clear':     () => new vscode.ThemeIcon('clear-all'),
  'action.edit':      () => new vscode.ThemeIcon('edit'),
  'action.add':       () => new vscode.ThemeIcon('add'),
  'action.openFile':  () => new vscode.ThemeIcon('go-to-file'),

  // git/version (using codicons since we ran out of time drawing)
  'git.git':     () => new vscode.ThemeIcon('git-branch'),
  'git.branch':  () => new vscode.ThemeIcon('git-branch'),
  'git.tag':     () => new vscode.ThemeIcon('tag'),
  'git.version': () => new vscode.ThemeIcon('versions'),
  'git.updated': () => new vscode.ThemeIcon('arrow-circle-up'),

  // misc
  'misc.missing':  () => new vscode.ThemeIcon('circle-slash'),
  'misc.skill':    () => iconPath('state/has-md.svg'),
  'misc.book':     () => new vscode.ThemeIcon('book'),
  'misc.bug':      () => new vscode.ThemeIcon('bug'),
  'misc.cloud':    () => new vscode.ThemeIcon('cloud'),
  'misc.warning':  () => iconPath('state/no-md.svg')
};

function icon(name) {
  const fn = REG[name];
  if (fn) return fn();
  return new vscode.ThemeIcon(name);
}

function toolIcon(tool)   { return icon(`tool.${tool}`) || icon('misc.skill'); }
function scopeIcon(scope) { return icon(`scope.${scope}`); }
function tierIcon(tier)   { return icon(`tier.${tier}`); }

module.exports = { init, icon, toolIcon, scopeIcon, tierIcon };
