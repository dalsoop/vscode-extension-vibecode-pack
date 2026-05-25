// Mirror Groups — write the same content to a configured set of parallel files.
// Two sources of "mirror peers":
//  1. Explicit groups in vibecodeSkills.mirrorGroups (manual)
//  2. Auto: SKILL.md files under .../skills/<name>/SKILL.md sharing the same <name>
//     (only when mirrorSkillsByName=true)
//
// All mirror peer resolution is path-based and side-effect-free until write.
import * as fs from 'fs';
import * as crypto from 'crypto';
import * as path from 'path';
import * as os from 'os';
import type { MirrorGroup } from './types';
import { readConfig } from './config';

function expand(p: string): string {
  if (p.startsWith('~/')) return path.join(os.homedir(), p.slice(2));
  return p;
}

function normalize(p: string): string {
  return path.resolve(expand(p));
}

export interface MirrorInfo {
  source: 'group' | 'skill-by-name';
  groupId?: string;
  groupLabel?: string;
  alwaysMirror?: boolean; // skip Save confirm (group flag, or skill-by-name-always)
  targets: string[]; // does NOT include the input file; only the other peers
}

/**
 * Resolve all mirror peers for an arbitrary absolute file path.
 * Returns one MirrorInfo per source (explicit group / auto skill).
 * Each entry's `targets` lists only OTHER files (caller is the source).
 */
export function findMirrors(abs: string): MirrorInfo[] {
  const normSelf = normalize(abs);
  const cfg = readConfig();
  const out: MirrorInfo[] = [];

  // 1. Explicit groups
  for (const g of cfg.mirrorGroups) {
    const normPaths = g.paths.map(normalize);
    if (!normPaths.includes(normSelf)) continue;
    const others = normPaths.filter(p => p !== normSelf);
    if (others.length) {
      out.push({
        source: 'group',
        groupId: g.id,
        groupLabel: g.label,
        alwaysMirror: !!g.alwaysMirror,
        targets: others
      });
    }
  }

  // 2. Auto skill mirror by name
  if (cfg.mirrorSkillsByName) {
    const base = path.basename(abs);
    if (/^skill\.md$/i.test(base)) {
      const skillName = path.basename(path.dirname(abs));
      // Walk known skill roots and look for siblings with the same directory name.
      const roots = collectSkillRoots(cfg);
      for (const root of roots) {
        const candidate = path.join(root, skillName, 'SKILL.md');
        const normCandidate = normalize(candidate);
        if (normCandidate === normSelf) continue;
        if (fs.existsSync(candidate)) {
          // Merge into existing skill-by-name entry or create one.
          let entry = out.find(e => e.source === 'skill-by-name');
          if (!entry) {
            entry = {
              source: 'skill-by-name',
              alwaysMirror: !!cfg.mirrorSkillsByNameAlways,
              targets: []
            };
            out.push(entry);
          }
          if (!entry.targets.includes(normCandidate)) entry.targets.push(normCandidate);
        }
      }
    }
  }

  return out;
}

function collectSkillRoots(cfg: ReturnType<typeof readConfig>): string[] {
  const home = os.homedir();
  const standard = [
    path.join(home, '.claude/skills'),
    path.join(home, '.claude/agents/skills'),
    path.join(home, '.codex/skills'),
    path.join(home, '.codex/agents/skills'),
    path.join(home, '.copilot/skills'),
    path.join(home, '.cursor/skills'),
    path.join(home, '.gemini/skills'),
    path.join(home, '.windsurf/skills'),
    path.join(home, '.cline/skills'),
    path.join(home, '.agents/skills')
  ];
  return [...standard, ...cfg.extraGlobalRoots.map(normalize)].filter(p => fs.existsSync(p));
}

/** Flatten findMirrors to a unique target list. */
export function allMirrorTargets(abs: string): string[] {
  const seen = new Set<string>();
  for (const info of findMirrors(abs)) {
    for (const t of info.targets) seen.add(t);
  }
  return [...seen];
}

function hashFile(p: string): string | null {
  try {
    const buf = fs.readFileSync(p);
    return crypto.createHash('sha1').update(buf).digest('hex');
  } catch {
    return null;
  }
}

export interface DriftPeer {
  path: string;
  exists: boolean;
  inSync: boolean; // matches the source hash
}

/**
 * Compare hash of `source` against all mirror peers (across all groups).
 * Missing files count as out-of-sync.
 */
export function detectDrift(source: string): { sourceHash: string | null; peers: DriftPeer[] } {
  const sourceHash = hashFile(source);
  const targets = allMirrorTargets(source);
  const peers: DriftPeer[] = targets.map(p => {
    const exists = fs.existsSync(p);
    if (!exists) return { path: p, exists: false, inSync: false };
    const h = hashFile(p);
    return { path: p, exists: true, inSync: h !== null && h === sourceHash };
  });
  return { sourceHash, peers };
}

export interface MirrorPreset {
  id: string;
  label: string;
  description: string;
  scope: 'global' | 'workspace';
  /** Function returns absolute paths to seed the group with — only existing files survive. */
  resolve: (ctx: { home: string; workspace?: string | null }) => string[];
}

export const PRESETS: MirrorPreset[] = [
  {
    id: 'global-root-md',
    label: 'Global agent instructions (root MDs)',
    description: 'Mirror the top-of-home instruction files used by Claude / Codex / Agents / Gemini',
    scope: 'global',
    resolve: ({ home }) => [
      path.join(home, 'CLAUDE.md'),
      path.join(home, 'AGENTS.md'),
      path.join(home, '.claude/CLAUDE.md'),
      path.join(home, '.codex/AGENTS.md'),
      path.join(home, '.gemini/GEMINI.md')
    ]
  },
  {
    id: 'workspace-root-md',
    label: 'Workspace agent instructions (root MDs)',
    description: 'Mirror the workspace-level instruction files',
    scope: 'workspace',
    resolve: ({ workspace }) => {
      if (!workspace) return [];
      return [
        path.join(workspace, 'CLAUDE.md'),
        path.join(workspace, 'AGENTS.md'),
        path.join(workspace, 'GEMINI.md'),
        path.join(workspace, '.codex/AGENTS.md')
      ];
    }
  }
];

/** Resolve a preset against the current environment, dropping non-existent paths. */
export function expandPreset(preset: MirrorPreset, workspace: string | null): string[] {
  const home = os.homedir();
  return preset.resolve({ home, workspace }).filter(p => fs.existsSync(p));
}

export interface MirrorWriteResult {
  written: string[];
  skipped: Array<{ path: string; reason: string }>;
}

/**
 * Write `content` to every target (full file replacement).
 * - Creates parent directory if missing
 * - Skips paths that resolve to the source itself
 * - Returns per-path outcome
 */
export function mirrorWrite(sourcePath: string, targets: string[], content: string): MirrorWriteResult {
  const result: MirrorWriteResult = { written: [], skipped: [] };
  const normSource = normalize(sourcePath);
  for (const t of targets) {
    const normT = normalize(t);
    if (normT === normSource) {
      result.skipped.push({ path: t, reason: 'same as source' });
      continue;
    }
    try {
      fs.mkdirSync(path.dirname(normT), { recursive: true });
      fs.writeFileSync(normT, content, 'utf8');
      result.written.push(normT);
    } catch (e: any) {
      result.skipped.push({ path: t, reason: e.message });
    }
  }
  return result;
}
