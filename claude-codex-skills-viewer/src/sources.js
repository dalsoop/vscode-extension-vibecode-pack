const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { describeSkill } = require('./parser');

const STANDARD_GLOBAL_ROOTS = [
  { tool: 'claude',  label: 'Claude',  icon: 'sparkle', rel: ['.claude', 'skills'] },
  { tool: 'codex',   label: 'Codex',   icon: 'robot',   rel: ['.codex',  'skills'] },
  { tool: 'copilot', label: 'Copilot', icon: 'github',  rel: ['.copilot','skills'] },
  { tool: 'agents',  label: 'Agents',  icon: 'organization', rel: ['.agents', 'skills'] }
];

const STANDARD_WORKSPACE_ROOTS = [
  { tool: 'claude',  label: 'Claude',  icon: 'sparkle', rel: ['.claude', 'skills'] },
  { tool: 'codex',   label: 'Codex',   icon: 'robot',   rel: ['.codex',  'skills'] },
  { tool: 'copilot', label: 'Copilot', icon: 'github',  rel: ['.github', 'skills'] },
  { tool: 'cursor',  label: 'Cursor',  icon: 'edit',    rel: ['.cursor', 'rules'] },
  { tool: 'windsurf',label: 'Windsurf',icon: 'wind',    rel: ['.codeium','windsurf','skills'] },
  { tool: 'cline',   label: 'Cline',   icon: 'tools',   rel: ['.clinerules'] }
];

function readCfg() {
  const cfg = vscode.workspace.getConfiguration('claudeCodexSkills');
  return {
    includeGlobal: cfg.get('includeGlobal', true),
    includeWorkspace: cfg.get('includeWorkspace', true),
    includeExtensions: cfg.get('includeExtensions', true),
    extraGlobalRoots: cfg.get('extraGlobalRoots', []),
    extraWorkspaceRoots: cfg.get('extraWorkspaceRoots', []),
    tools: cfg.get('tools', 'all')
  };
}

function getStandardSources() {
  const cfg = readCfg();
  const sources = [];
  const home = os.homedir();
  const wsFolder = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0];
  const ws = wsFolder ? wsFolder.uri.fsPath : null;

  if (cfg.includeGlobal) {
    for (const r of STANDARD_GLOBAL_ROOTS) {
      if (cfg.tools !== 'all' && cfg.tools !== r.tool) continue;
      sources.push({
        id: `${r.tool}-global`, tool: r.tool, label: r.label, scope: 'global',
        icon: r.icon, dir: path.join(home, ...r.rel)
      });
    }
    for (const dir of cfg.extraGlobalRoots) {
      sources.push({ id: `extra-${dir}`, tool: 'custom', label: 'Custom', scope: 'global', icon: 'folder', dir });
    }
  }
  if (cfg.includeWorkspace && ws) {
    for (const r of STANDARD_WORKSPACE_ROOTS) {
      if (cfg.tools !== 'all' && cfg.tools !== r.tool) continue;
      sources.push({
        id: `${r.tool}-ws`, tool: r.tool, label: r.label, scope: 'workspace',
        icon: r.icon, dir: path.join(ws, ...r.rel)
      });
    }
    for (const dir of cfg.extraWorkspaceRoots) {
      const abs = path.isAbsolute(dir) ? dir : path.join(ws, dir);
      sources.push({ id: `extra-ws-${dir}`, tool: 'custom', label: 'Custom', scope: 'workspace', icon: 'folder', dir: abs });
    }
  }
  return sources;
}

function getExtensionBundledSources() {
  const cfg = readCfg();
  if (!cfg.includeExtensions) return [];
  const sources = [];
  for (const ext of vscode.extensions.all) {
    try {
      const contrib = ext.packageJSON && ext.packageJSON.contributes;
      const cs = (contrib && (contrib.chatSkills || contrib.skills || [])) || [];
      for (const s of cs) {
        const p = s.path && (path.isAbsolute(s.path) ? s.path : path.join(ext.extensionPath, s.path));
        const dir = p && p.endsWith('.md') ? path.dirname(p) : p;
        if (dir && fs.existsSync(dir)) {
          sources.push({
            id: `ext-${ext.id}`, tool: 'extension', label: ext.packageJSON.displayName || ext.id,
            scope: 'extension', icon: 'extensions', dir, readOnly: true, extensionId: ext.id
          });
        }
      }
      const possibleSkillsDir = path.join(ext.extensionPath, 'skills');
      if (fs.existsSync(possibleSkillsDir) && !sources.some(s => s.dir === possibleSkillsDir)) {
        sources.push({
          id: `ext-builtin-${ext.id}`, tool: 'extension',
          label: ext.packageJSON.displayName || ext.id, scope: 'extension',
          icon: 'extensions', dir: possibleSkillsDir, readOnly: true, extensionId: ext.id
        });
      }
    } catch {}
  }
  return sources;
}

function listSkillNames(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true })
      .filter(e => !e.name.startsWith('.') && !e.name.startsWith('_'))
      .filter(e => {
        try { return fs.statSync(path.join(dir, e.name)).isDirectory(); } catch { return false; }
      })
      .map(e => e.name)
      .sort((a, b) => a.localeCompare(b));
  } catch {
    return null;
  }
}

function collectAllSkills(opts = {}) {
  const { scope = 'all', tool = 'all', source: srcId } = opts;
  const out = [];
  const all = [...getStandardSources(), ...getExtensionBundledSources()];
  for (const src of all) {
    if (scope !== 'all' && src.scope !== scope) continue;
    if (tool !== 'all' && src.tool !== tool) continue;
    if (srcId && src.id !== srcId) continue;
    const names = listSkillNames(src.dir);
    if (!names) continue;
    for (const name of names) {
      const dir = path.join(src.dir, name);
      const info = describeSkill(dir);
      out.push({ name, dir, source: src, info });
    }
  }
  return out;
}

module.exports = {
  STANDARD_GLOBAL_ROOTS, STANDARD_WORKSPACE_ROOTS,
  readCfg, getStandardSources, getExtensionBundledSources,
  listSkillNames, collectAllSkills
};
