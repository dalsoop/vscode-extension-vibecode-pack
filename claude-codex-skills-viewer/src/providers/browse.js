const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const { listSourceSkills } = require('../github');
const icons = require('../icons');

let cachedCatalog = null;
function getCatalog(extPath) {
  if (cachedCatalog) return cachedCatalog;
  try {
    cachedCatalog = JSON.parse(fs.readFileSync(path.join(extPath, 'resources/catalog.json'), 'utf8'));
  } catch {
    cachedCatalog = { sources: [], categories: [] };
  }
  return cachedCatalog;
}

class BrowseProvider {
  constructor(extPath) {
    this._evt = new vscode.EventEmitter();
    this.onDidChangeTreeData = this._evt.event;
    this._extPath = extPath;
    this._cache = new Map();  // sourceId -> [{ name, path, ... }]
    this._loading = new Set();
    this.filter = '';
  }
  refresh(sourceId) {
    if (sourceId) this._cache.delete(sourceId); else this._cache.clear();
    this._evt.fire();
  }
  setFilter(q) { this.filter = (q || '').trim().toLowerCase(); this.refresh(); }
  getTreeItem(e) { return e; }

  async getChildren(el) {
    if (!el) return this._sources();
    if (el._kind === 'source') return this._skillsForSource(el._src);
    return [];
  }

  _sources() {
    const cat = getCatalog(this._extPath);
    const tiers = { official: 0, curated: 1, community: 2 };
    const sorted = [...cat.sources].sort((a, b) => (tiers[a.tier] ?? 99) - (tiers[b.tier] ?? 99));
    return sorted.map(src => {
      const it = new vscode.TreeItem(src.name, vscode.TreeItemCollapsibleState.Collapsed);
      it.description = src.tier;
      it.tooltip = `${src.repo}@${src.branch || 'main'}`;
      it.iconPath = icons.icon(`tier.${src.tier}`);
      it.contextValue = 'remote-source';
      it._kind = 'source';
      it._src = src;
      return it;
    });
  }

  async _skillsForSource(src) {
    let items = this._cache.get(src.id);
    if (!items) {
      if (this._loading.has(src.id)) return [this._loadingItem()];
      this._loading.add(src.id);
      try {
        items = await listSourceSkills(src);
        this._cache.set(src.id, items);
      } catch (e) {
        this._loading.delete(src.id);
        const it = new vscode.TreeItem(`Failed: ${e.message}`, vscode.TreeItemCollapsibleState.None);
        it.iconPath = icons.icon('misc.warning');
        return [it];
      }
      this._loading.delete(src.id);
    }
    const f = this.filter;
    return items
      .filter(s => !f || s.name.toLowerCase().includes(f))
      .map(s => {
        const it = new vscode.TreeItem(s.name, vscode.TreeItemCollapsibleState.None);
        it.description = src.repo;
        it.iconPath = icons.icon('action.install');
        it.tooltip = `${src.repo}/${s.path}\nClick to install`;
        it.contextValue = 'remote-skill';
        it._kind = 'remote-skill';
        it._src = src;
        it._skill = s;
        it.command = {
          command: 'claudeCodexSkills.installRemoteSkill',
          title: 'Install',
          arguments: [{ source: src, skill: s }]
        };
        return it;
      });
  }

  _loadingItem() {
    const it = new vscode.TreeItem('Loading…', vscode.TreeItemCollapsibleState.None);
    it.iconPath = icons.icon('action.refresh');
    return it;
  }
}

module.exports = { BrowseProvider, getCatalog };
