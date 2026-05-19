const vscode = require('vscode');
const icons = require('./src/icons');
const state = require('./src/state');
const commands = require('./src/commands');
const lmTools = require('./src/lmTools');
const chat = require('./src/chat');
const statusBar = require('./src/statusBar');
const { InstalledProvider } = require('./src/providers/installed');
const { UserGlobalProvider } = require('./src/providers/userGlobal');
const { CategoriesProvider } = require('./src/providers/categories');
const { BrowseProvider } = require('./src/providers/browse');
const { InstructionsProvider } = require('./src/providers/instructions');

function activate(context) {
  icons.init(context.extensionPath);
  state.init(context);

  const installed = new InstalledProvider();
  const userGlobal = new UserGlobalProvider();
  const categories = new CategoriesProvider();
  const browse = new BrowseProvider(context.extensionPath);
  const instructions = new InstructionsProvider();

  context.subscriptions.push(
    vscode.window.createTreeView('ccskills.installed',    { treeDataProvider: installed,    showCollapseAll: true }),
    vscode.window.createTreeView('ccskills.userGlobal',   { treeDataProvider: userGlobal,   showCollapseAll: true }),
    vscode.window.createTreeView('ccskills.categories',   { treeDataProvider: categories,   showCollapseAll: true }),
    vscode.window.createTreeView('ccskills.browse',       { treeDataProvider: browse,       showCollapseAll: true }),
    vscode.window.createTreeView('ccskills.instructions', { treeDataProvider: instructions, showCollapseAll: true })
  );

  commands.register(context, { installed, userGlobal, categories, instructions }, browse);
  lmTools.registerAll(context);
  chat.register(context);
  statusBar.activate(context);

  // refresh status bar on configuration change
  context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
    if (e.affectsConfiguration('claudeCodexSkills')) statusBar.refresh();
  }));
}

function deactivate() {}

module.exports = { activate, deactivate };
