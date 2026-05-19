// Mirror Groups — write the same content to a configured set of parallel files.
// Two sources of "mirror peers":
//  1. Explicit groups in claudeCodexSkills.mirrorGroups (manual)
//  2. Auto: SKILL.md files under .../skills/<name>/SKILL.md sharing the same <name>
//     (only when mirrorSkillsByName=true)
//
// All mirror peer resolution is path-based and side-effect-free until write.
import * as fs from 'fs';
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
      out.push({ source: 'group', groupId: g.id, groupLabel: g.label, targets: others });
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
            entry = { source: 'skill-by-name', targets: [] };
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
