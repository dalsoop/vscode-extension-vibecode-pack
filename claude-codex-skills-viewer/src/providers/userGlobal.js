const vscode = require('vscode');
const path = require('path');
const { getStandardSources, getExtensionBundledSources, listSkillNames } = require('../sources');
const { describeSkill } = require('../parser');
const state = require('../state');
const icons = require('../icons');
const det = require('../instructionsDetector');

class UserGlobalProvider {
  constructor() {
    this._evt = new vscode.EventEmitter();
    this.onDidChangeTreeData = this._evt.event;
    this.filter = '';
  }
  refresh() { this._evt.fire(); }
  setFilter(q) { this.filter = (q || '').trim().toLowerCase(); this.refresh(); }
  getTreeItem(e) { return e; }

  getChildren(el) {
    if (!el) return this._roots();
    if (el._kind === 'group') return this._skillsForSource(el._source);
    if (el._kind === 'skill') return this._auxForSkill(el);
    return [];
  }

  _roots() {
    const groups = [];
    const globals = getStandardSources().filter(s => s.scope === 'global');
    for (const src of globals) groups.push(this._makeGroup(src));
    const exts = getExtensionBundledSources();
    for (const src of exts) groups.push(this._makeGroup(src));
    return groups;
  }

  _makeGroup(src) {
    const names = listSkillNames(src.dir);
    const exists = names !== null;
    const count = exists ? names.length : 0;
    const it = new vscode.TreeItem(`${src.label} · ${src.scope}`,
      exists && count > 0
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None);
    it.description = exists ? `${count}` : '✕';
    it.tooltip = src.dir;
    it.contextValue = src.readOnly ? 'source-readonly' : 'source';
    it.iconPath = icons.toolIcon(src.tool);
    it._kind = 'group';
    it._source = src;
    it._dir = src.dir;
    return it;
  }

  _skillsForSource(src) {
    const f = this.filter;
    const names = listSkillNames(src.dir) || [];
    const favSet = new Set(state.listFavorites());
    const out = [];
    for (const name of names) {
      const dir = path.join(src.dir, name);
      const info = describeSkill(dir);
      if (f) {
        const hay = `${name} ${info.description || ''} ${info.whenToUse || ''} ${(info.categories || []).join(' ')}`.toLowerCase();
        if (!hay.includes(f)) continue;
      }
      const isFav = favSet.has(dir);
      const isNew = state.isNew(dir);
      const aux = det.listPerSkillFiles(dir).filter(x => x.label !== 'SKILL.md');
      const hasAux = aux.length > 0;
      const it = new vscode.TreeItem(name,
        hasAux ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None);
      const auxLabel = hasAux ? ` 📎${aux.length}` : '';
      const desc = info.description ? info.description.slice(0, 88) : (info.mdPath ? '' : '(no .md)');
      it.description = [isNew ? 'NEW' : null, desc + auxLabel].filter(Boolean).join(' · ');
      it.tooltip = new vscode.MarkdownString(
        `**${name}**\n\n` +
        (info.description ? `${info.description}\n\n` : '') +
        (info.whenToUse ? `_When to use_: ${info.whenToUse}\n\n` : '') +
        ((info.categories || []).length ? `_Categories_: ${info.categories.join(', ')}\n\n` : '') +
        (hasAux ? `_Aux files_: ${aux.map(x => x.label).join(', ')}\n\n` : '') +
        `\`${dir}\`` +
        (src.readOnly ? '\n\n_read-only_' : '')
      );
      it.iconPath = isFav ? icons.icon('state.favorite-filled')
                          : (src.readOnly ? icons.icon('state.readonly')
                                          : (info.mdPath ? icons.icon('misc.skill') : icons.icon('misc.warning')));
      it.resourceUri = vscode.Uri.file(dir);
      it.contextValue = ['skill', src.readOnly ? 'readonly' : 'writable', isFav ? 'fav' : 'nofav'].join(' ');
      if (info.mdPath) {
        it.command = {
          command: 'claudeCodexSkills.previewSkill',
          title: 'Preview',
          arguments: [{ dir, mdPath: info.mdPath, name, source: src }]
        };
      }
      it._kind = 'skill';
      it._dir = dir;
      it._mdPath = info.mdPath;
      it._info = info;
      it._source = src;
      it._aux = aux;
      out.push(it);
    }
    return out;
  }

  _auxForSkill(skillItem) {
    const aux = skillItem._aux || [];
    return aux.map(f => {
      const it = new vscode.TreeItem(f.label, vscode.TreeItemCollapsibleState.None);
      it.description = `${det.formatBytes(f.size)} · ${det.formatAge(f.mtime)}${f.hasBlock ? ' · 🔄' : ''}`;
      it.tooltip = f.abs;
      it.iconPath = icons.icon('action.openFile');
      it.contextValue = 'inst-file exists per-skill';
      it.resourceUri = vscode.Uri.file(f.abs);
      it.command = {
        command: 'claudeCodexSkills.openInstructionFile',
        title: 'Open',
        arguments: [{ abs: f.abs }]
      };
      it._kind = 'inst-file';
      it._file = f;
      return it;
    });
  }
}

module.exports = { UserGlobalProvider };
