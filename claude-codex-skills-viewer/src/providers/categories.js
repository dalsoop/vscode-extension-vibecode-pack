const vscode = require('vscode');
const { collectAllSkills } = require('../sources');
const state = require('../state');
const icons = require('../icons');

class CategoriesProvider {
  constructor() {
    this._evt = new vscode.EventEmitter();
    this.onDidChangeTreeData = this._evt.event;
    this.filter = '';
  }
  refresh() { this._evt.fire(); }
  setFilter(q) { this.filter = (q || '').trim().toLowerCase(); this.refresh(); }
  getTreeItem(e) { return e; }

  getChildren(el) {
    if (!el) return this._categories();
    if (el._kind === 'cat') return this._skillsForCat(el._cat);
    return [];
  }

  _categories() {
    const all = collectAllSkills({});
    const buckets = new Map();
    const uncategorized = [];
    for (const it of all) {
      const cats = (it.info && it.info.categories) || [];
      if (!cats.length) { uncategorized.push(it); continue; }
      for (const c of cats) {
        const k = String(c).trim();
        if (!buckets.has(k)) buckets.set(k, []);
        buckets.get(k).push(it);
      }
    }
    const out = [...buckets.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([cat, items]) => {
        const it = new vscode.TreeItem(cat, vscode.TreeItemCollapsibleState.Collapsed);
        it.description = `${items.length}`;
        it.iconPath = icons.icon('action.add');
        it.contextValue = 'category';
        it._kind = 'cat';
        it._cat = cat;
        it._items = items;
        return it;
      });
    if (uncategorized.length) {
      const it = new vscode.TreeItem('(uncategorized)', vscode.TreeItemCollapsibleState.Collapsed);
      it.description = `${uncategorized.length}`;
      it.iconPath = icons.icon('misc.warning');
      it.contextValue = 'category';
      it._kind = 'cat';
      it._cat = null;
      it._items = uncategorized;
      out.push(it);
    }
    return out;
  }

  _skillsForCat(cat) {
    const all = collectAllSkills({});
    const items = cat === null
      ? all.filter(x => !((x.info && x.info.categories) || []).length)
      : all.filter(x => ((x.info && x.info.categories) || []).includes(cat));
    const favSet = new Set(state.listFavorites());
    const f = this.filter;
    const out = [];
    for (const { name, dir, source, info } of items) {
      if (f) {
        const hay = `${name} ${info.description || ''} ${info.whenToUse || ''}`.toLowerCase();
        if (!hay.includes(f)) continue;
      }
      const isFav = favSet.has(dir);
      const it = new vscode.TreeItem(name, vscode.TreeItemCollapsibleState.None);
      it.description = `${source.label}/${source.scope}` + (info.description ? ` · ${info.description.slice(0, 60)}` : '');
      it.tooltip = `${name}\n${dir}`;
      it.iconPath = isFav ? icons.icon('state.favorite-filled') : icons.toolIcon(source.tool);
      it.resourceUri = vscode.Uri.file(dir);
      it.contextValue = ['skill', source.readOnly ? 'readonly' : 'writable', isFav ? 'fav' : 'nofav'].join(' ');
      if (info.mdPath) {
        it.command = {
          command: 'claudeCodexSkills.previewSkill',
          title: 'Preview',
          arguments: [{ dir, mdPath: info.mdPath, name, source }]
        };
      }
      it._kind = 'skill';
      it._dir = dir;
      it._mdPath = info.mdPath;
      it._info = info;
      it._source = source;
      out.push(it);
    }
    return out;
  }
}

module.exports = { CategoriesProvider };
