const vscode = require('vscode');
const path = require('path');
const det = require('../instructionsDetector');
const icons = require('../icons');

function statusBadge(f) {
  if (!f.exists) return '✕ missing';
  if (f.hasBlock) return `🔄 synced · ${det.formatBytes(f.size)}`;
  return `${det.formatBytes(f.size)} · ${det.formatAge(f.mtime)}`;
}

class InstructionsProvider {
  constructor() {
    this._evt = new vscode.EventEmitter();
    this.onDidChangeTreeData = this._evt.event;
  }
  refresh() { this._evt.fire(); }
  getTreeItem(e) { return e; }

  getChildren(el) {
    if (!el) return this._sections();
    if (el._kind === 'section-workspace') return this._files(det.listWorkspaceFiles());
    if (el._kind === 'section-global')    return this._files(det.listGlobalFiles());
    return [];
  }

  _sections() {
    const ws = !!(vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length);
    const out = [];
    if (ws) {
      const wsFiles = det.listWorkspaceFiles();
      const present = wsFiles.filter(f => f.exists).length;
      const synced = wsFiles.filter(f => f.hasBlock).length;
      const it = new vscode.TreeItem('Workspace', vscode.TreeItemCollapsibleState.Expanded);
      it.description = `${present}/${wsFiles.length} present · ${synced} synced`;
      it.iconPath = icons.icon('scope.workspace');
      it.contextValue = 'inst-section';
      it._kind = 'section-workspace';
      out.push(it);
    }
    const gf = det.listGlobalFiles();
    const presentG = gf.filter(f => f.exists).length;
    const syncedG = gf.filter(f => f.hasBlock).length;
    const itg = new vscode.TreeItem('User · Global', vscode.TreeItemCollapsibleState.Collapsed);
    itg.description = `${presentG}/${gf.length} present · ${syncedG} synced`;
    itg.iconPath = icons.icon('scope.global');
    itg.contextValue = 'inst-section';
    itg._kind = 'section-global';
    out.push(itg);
    return out;
  }

  _files(files) {
    return files.map(f => {
      const it = new vscode.TreeItem(f.label, vscode.TreeItemCollapsibleState.None);
      it.description = statusBadge(f);
      const md = new vscode.MarkdownString(
        `**${f.label}** _(${f.note || f.tool})_\n\n` +
        `\`${f.abs}\`\n\n` +
        (f.exists ? `- size: ${det.formatBytes(f.size)}\n- modified: ${det.formatAge(f.mtime)}\n- ccskills block: ${f.hasBlock ? '✅ present' : '— absent'}` : '_(file does not exist)_')
      );
      it.tooltip = md;
      it.contextValue = [
        'inst-file',
        f.exists ? 'exists' : 'missing',
        f.hasBlock ? 'hasBlock' : 'noBlock',
        f.kind
      ].join(' ');
      it.iconPath = !f.exists ? icons.icon('misc.missing')
                              : (f.hasBlock ? icons.icon('git.updated') : icons.toolIcon(f.tool));
      if (f.exists) {
        it.resourceUri = vscode.Uri.file(f.abs);
        it.command = {
          command: 'claudeCodexSkills.openInstructionFile',
          title: 'Open',
          arguments: [{ abs: f.abs }]
        };
      }
      it._kind = 'inst-file';
      it._file = f;
      return it;
    });
  }
}

module.exports = { InstructionsProvider };
