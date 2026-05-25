import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { describeSkill } from './parser';
import type { Source, Skill, SkillRoot, RootScope } from './types';

// Single root registry. `scopes` controls where it's applied; per-tool path
// can differ between global and workspace via the helper `pickSegments`.
export const SKILL_ROOTS: SkillRoot[] = [
  {
    tool: 'claude',
    label: 'Claude',
    icon: 'sparkle',
    scopes: ['global', 'workspace'],
    segments: ['.claude', 'skills'],
    layout: 'folder-tree'
  },
  {
    tool: 'codex',
    label: 'Codex',
    icon: 'robot',
    scopes: ['global', 'workspace'],
    segments: ['.codex', 'skills'],
    layout: 'folder-tree'
  },
  {
    tool: 'copilot',
    label: 'Copilot',
    icon: 'github',
    scopes: ['global'],
    segments: ['.copilot', 'skills'],
    layout: 'folder-tree'
  },
  {
    tool: 'gemini',
    label: 'Gemini',
    icon: 'star',
    scopes: ['global', 'workspace'],
    segments: ['.gemini', 'skills'],
    layout: 'folder-tree'
  },
  {
    tool: 'agents',
    label: 'Agents',
    icon: 'organization',
    scopes: ['global'],
    segments: ['.agents', 'skills'],
    layout: 'folder-tree'
  },
  {
    tool: 'cursor',
    label: 'Cursor',
    icon: 'edit',
    scopes: ['workspace'],
    segments: ['.cursor', 'rules'],
    layout: 'rules-file'
  },
  {
    tool: 'windsurf',
    label: 'Windsurf',
    icon: 'wind',
    scopes: ['workspace'],
    segments: ['.codeium', 'windsurf', 'skills'],
    layout: 'folder-tree'
  },
  {
    tool: 'cline',
    label: 'Cline',
    icon: 'tools',
    scopes: ['workspace'],
    segments: ['.clinerules'],
    layout: 'single-md'
  }
];

// Copilot uses a different layout for workspace (.github/skills). Defined as a
// workspace-only override here; can be cleaned up later if Copilot global
// migrates as well.
const COPILOT_WS: SkillRoot = {
  tool: 'copilot',
  label: 'Copilot',
  icon: 'github',
  scopes: ['workspace'],
  segments: ['.github', 'skills'],
  layout: 'folder-tree'
};

import { readConfig } from './config';

// Local alias kept for back-compat. Prefer `readConfig` directly going forward.
export const readCfg = readConfig;

function sourceFrom(root: SkillRoot, scope: RootScope, baseDir: string, idSuffix: string): Source {
  return {
    id: `${root.tool}-${idSuffix}`,
    tool: root.tool,
    label: root.label,
    scope,
    icon: root.icon,
    dir: path.join(baseDir, ...root.segments)
  };
}

function rootsFor(scope: RootScope): SkillRoot[] {
  if (scope === 'workspace') {
    return SKILL_ROOTS.map(r => (r.tool === 'copilot' && r.scopes.includes('workspace') ? COPILOT_WS : r)).filter(r =>
      r.scopes.includes('workspace')
    );
  }
  return SKILL_ROOTS.filter(r => r.scopes.includes('global'));
}

export function getStandardSources(): Source[] {
  const cfg = readCfg();
  const sources: Source[] = [];
  const home = os.homedir();
  const wsFolder = vscode.workspace.workspaceFolders?.[0];
  const ws = wsFolder ? wsFolder.uri.fsPath : null;

  if (cfg.includeGlobal) {
    for (const r of rootsFor('global')) {
      if (cfg.tools !== 'all' && cfg.tools !== r.tool) continue;
      sources.push(sourceFrom(r, 'global', home, 'global'));
    }
    for (const dir of cfg.extraGlobalRoots) {
      sources.push({ id: `extra-${dir}`, tool: 'custom', label: 'Custom', scope: 'global', icon: 'folder', dir });
    }
  }
  if (cfg.includeWorkspace && ws) {
    for (const r of rootsFor('workspace')) {
      if (cfg.tools !== 'all' && cfg.tools !== r.tool) continue;
      sources.push(sourceFrom(r, 'workspace', ws, 'ws'));
    }
    for (const dir of cfg.extraWorkspaceRoots) {
      const abs = path.isAbsolute(dir) ? dir : path.join(ws, dir);
      sources.push({
        id: `extra-ws-${dir}`,
        tool: 'custom',
        label: 'Custom',
        scope: 'workspace',
        icon: 'folder',
        dir: abs
      });
    }
  }
  return sources;
}

// Sources rooted at an arbitrary directory (for "this folder" scope).
export function getSourcesUnder(baseDir: string): Source[] {
  const out: Source[] = [];
  for (const r of SKILL_ROOTS) {
    // Re-use both scope variants to maximize discovery in unknown subdirs.
    if (r.scopes.includes('workspace') || r.scopes.includes('global')) {
      const root = r.tool === 'copilot' ? COPILOT_WS : r;
      out.push(sourceFrom(root, 'workspace', baseDir, 'this-folder'));
    }
  }
  return out;
}

export function getExtensionBundledSources(): Source[] {
  const cfg = readCfg();
  if (!cfg.includeExtensions) return [];
  const sources: Source[] = [];
  for (const ext of vscode.extensions.all) {
    try {
      const contrib = ext.packageJSON?.contributes;
      const cs: any[] = (contrib && (contrib.chatSkills || contrib.skills)) || [];
      for (const s of cs) {
        const p = s.path && (path.isAbsolute(s.path) ? s.path : path.join(ext.extensionPath, s.path));
        const dir = p && p.endsWith('.md') ? path.dirname(p) : p;
        if (dir && fs.existsSync(dir)) {
          sources.push({
            id: `ext-${ext.id}`,
            tool: 'extension',
            label: ext.packageJSON.displayName || ext.id,
            scope: 'extension',
            icon: 'extensions',
            dir,
            readOnly: true,
            extensionId: ext.id
          });
        }
      }
      const possibleSkillsDir = path.join(ext.extensionPath, 'skills');
      if (fs.existsSync(possibleSkillsDir) && !sources.some(s => s.dir === possibleSkillsDir)) {
        sources.push({
          id: `ext-builtin-${ext.id}`,
          tool: 'extension',
          label: ext.packageJSON.displayName || ext.id,
          scope: 'extension',
          icon: 'extensions',
          dir: possibleSkillsDir,
          readOnly: true,
          extensionId: ext.id
        });
      }
    } catch {}
  }
  return sources;
}

export function listSkillNames(dir: string): string[] | null {
  try {
    return fs
      .readdirSync(dir, { withFileTypes: true })
      .filter(e => !e.name.startsWith('.') && !e.name.startsWith('_'))
      .filter(e => {
        try {
          return fs.statSync(path.join(dir, e.name)).isDirectory();
        } catch {
          return false;
        }
      })
      .map(e => e.name)
      .sort((a, b) => a.localeCompare(b));
  } catch {
    return null;
  }
}

export interface CollectOpts {
  scope?: string;
  tool?: string;
  source?: string;
}

export function collectAllSkills(opts: CollectOpts = {}): Skill[] {
  const { scope = 'all', tool = 'all', source: srcId } = opts;
  const out: Skill[] = [];
  const all = [...getStandardSources(), ...getExtensionBundledSources()];
  for (const src of all) {
    if (scope !== 'all' && src.scope !== scope) continue;
    if (tool !== 'all' && src.tool !== tool) continue;
    if (srcId && src.id !== srcId) continue;
    const names = listSkillNames(src.dir);
    if (!names) continue;
    for (const name of names) {
      const dir = path.join(src.dir, name);
      out.push({ name, dir, source: src, info: describeSkill(dir) });
    }
  }
  return out;
}

// "This folder" enumeration — reuses SKILL_ROOTS against an active dir.
export function collectSkillsUnder(baseDir: string): Skill[] {
  const out: Skill[] = [];
  for (const src of getSourcesUnder(baseDir)) {
    const names = listSkillNames(src.dir);
    if (!names) continue;
    for (const name of names) {
      const dir = path.join(src.dir, name);
      out.push({
        name,
        dir,
        source: { ...src, scope: 'this folder' },
        info: describeSkill(dir)
      });
    }
  }
  return out;
}
