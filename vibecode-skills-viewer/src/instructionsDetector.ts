import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { InstructionFile, ToolId } from './types';

export const START = '<!-- vibeskills-START -->';
export const END = '<!-- vibeskills-END -->';
// Legacy markers from the old "ccskills" brand. Read for detection so existing
// user blocks still register; never written.
export const LEGACY_START = '<!-- ccskills-START -->';
export const LEGACY_END = '<!-- ccskills-END -->';

export type InstructionScope = 'workspace' | 'global' | 'per-skill';
export type InstructionCategory = 'memory' | 'rules' | 'instructions';

export interface InstructionFileDef {
  id: string; // unique
  pattern: string; // relative path (workspace) or abs (global)
  label: string; // display label
  tool: ToolId;
  note: string; // short description
  scope: InstructionScope;
  category: InstructionCategory;
  absolute?: boolean; // pattern is already absolute (global)
}

const home = os.homedir();
const homeAbs = (...p: string[]) => path.join(home, ...p);

// Single registry. Workspace entries are relative; global entries are absolute.
export const INSTRUCTION_FILES: InstructionFileDef[] = [
  // ── workspace ─────────────────────────────────────────────────────────
  {
    id: 'ws.CLAUDE.md',
    pattern: 'CLAUDE.md',
    label: 'CLAUDE.md',
    tool: 'claude',
    note: 'Claude per-project memory',
    scope: 'workspace',
    category: 'memory'
  },
  {
    id: 'ws.AGENTS.md',
    pattern: 'AGENTS.md',
    label: 'AGENTS.md',
    tool: 'codex',
    note: 'Codex / generic agent memory',
    scope: 'workspace',
    category: 'memory'
  },
  {
    id: 'ws.GEMINI.md',
    pattern: 'GEMINI.md',
    label: 'GEMINI.md',
    tool: 'gemini',
    note: 'Gemini CLI memory',
    scope: 'workspace',
    category: 'memory'
  },
  {
    id: 'ws.cursor.rules',
    pattern: '.cursor/rules',
    label: '.cursor/rules',
    tool: 'cursor',
    note: 'Cursor rules',
    scope: 'workspace',
    category: 'rules'
  },
  {
    id: 'ws.cursorrules',
    pattern: '.cursorrules',
    label: '.cursorrules',
    tool: 'cursor',
    note: 'Legacy Cursor rules',
    scope: 'workspace',
    category: 'rules'
  },
  {
    id: 'ws.windsurfrules',
    pattern: '.windsurfrules',
    label: '.windsurfrules',
    tool: 'windsurf',
    note: 'Windsurf rules',
    scope: 'workspace',
    category: 'rules'
  },
  {
    id: 'ws.clinerules',
    pattern: '.clinerules',
    label: '.clinerules',
    tool: 'cline',
    note: 'Cline rules',
    scope: 'workspace',
    category: 'rules'
  },
  {
    id: 'ws.copilot.instructions',
    pattern: '.github/copilot-instructions.md',
    label: 'copilot-instructions.md',
    tool: 'copilot',
    note: 'GitHub Copilot',
    scope: 'workspace',
    category: 'instructions'
  },
  {
    id: 'ws.copilot.legacy',
    pattern: '.copilot/instructions.md',
    label: 'copilot instructions.md',
    tool: 'copilot',
    note: 'GitHub Copilot (legacy)',
    scope: 'workspace',
    category: 'instructions'
  },

  // ── global ────────────────────────────────────────────────────────────
  {
    id: 'g.claude.CLAUDE.md',
    pattern: homeAbs('.claude', 'CLAUDE.md'),
    label: '~/.claude/CLAUDE.md',
    tool: 'claude',
    note: 'Claude global memory',
    scope: 'global',
    category: 'memory',
    absolute: true
  },
  {
    id: 'g.user.CLAUDE.md',
    pattern: homeAbs('CLAUDE.md'),
    label: '~/CLAUDE.md',
    tool: 'claude',
    note: 'User-wide Claude memory',
    scope: 'global',
    category: 'memory',
    absolute: true
  },
  {
    id: 'g.codex.AGENTS.md',
    pattern: homeAbs('.codex', 'AGENTS.md'),
    label: '~/.codex/AGENTS.md',
    tool: 'codex',
    note: 'Codex global memory',
    scope: 'global',
    category: 'memory',
    absolute: true
  },
  {
    id: 'g.user.AGENTS.md',
    pattern: homeAbs('AGENTS.md'),
    label: '~/AGENTS.md',
    tool: 'codex',
    note: 'User-wide agent memory',
    scope: 'global',
    category: 'memory',
    absolute: true
  },
  {
    id: 'g.gemini.GEMINI.md',
    pattern: homeAbs('.gemini', 'GEMINI.md'),
    label: '~/.gemini/GEMINI.md',
    tool: 'gemini',
    note: 'Gemini global memory',
    scope: 'global',
    category: 'memory',
    absolute: true
  },
  {
    id: 'g.user.GEMINI.md',
    pattern: homeAbs('GEMINI.md'),
    label: '~/GEMINI.md',
    tool: 'gemini',
    note: 'User-wide Gemini memory',
    scope: 'global',
    category: 'memory',
    absolute: true
  },
  {
    id: 'g.copilot.instructions',
    pattern: homeAbs('.copilot', 'instructions.md'),
    label: '~/.copilot/instructions.md',
    tool: 'copilot',
    note: 'GitHub Copilot global',
    scope: 'global',
    category: 'instructions',
    absolute: true
  },
  {
    id: 'g.agents.AGENTS.md',
    pattern: homeAbs('.agents', 'AGENTS.md'),
    label: '~/.agents/AGENTS.md',
    tool: 'agents',
    note: 'Agents global',
    scope: 'global',
    category: 'memory',
    absolute: true
  }
];

export const PER_SKILL_FILES = ['CLAUDE.md', 'AGENTS.md', 'README.md', 'NOTES.md'];

interface Inspected {
  abs: string;
  exists: boolean;
  size: number;
  mtime: number;
  hasBlock: boolean;
  blockSize: number;
}

function firstIndex(s: string, markers: string[]): number {
  let best = -1;
  for (const m of markers) {
    const i = s.indexOf(m);
    if (i !== -1 && (best === -1 || i < best)) best = i;
  }
  return best;
}

function firstEndAfter(
  s: string,
  markers: string[],
  after: number
): { index: number; marker: string } | null {
  if (after === -1) return null;
  let best: { index: number; marker: string } | null = null;
  for (const m of markers) {
    const i = s.indexOf(m, after);
    if (i !== -1 && (!best || i < best.index)) best = { index: i, marker: m };
  }
  return best;
}

export function inspect(abs: string): Inspected {
  let exists = false,
    size = 0,
    mtime = 0,
    hasBlock = false,
    blockSize = 0;
  try {
    const st = fs.statSync(abs);
    exists = st.isFile();
    size = st.size;
    mtime = st.mtimeMs;
    if (exists && size < 500_000) {
      const raw = fs.readFileSync(abs, 'utf8');
      const startIdx = firstIndex(raw, [START, LEGACY_START]);
      const endMatch = firstEndAfter(raw, [END, LEGACY_END], startIdx);
      if (startIdx !== -1 && endMatch && endMatch.index > startIdx) {
        hasBlock = true;
        blockSize = endMatch.index - startIdx + endMatch.marker.length;
      }
    }
  } catch {}
  return { abs, exists, size, mtime, hasBlock, blockSize };
}

function defToFile(def: InstructionFileDef, abs: string): InstructionFile {
  return {
    kind: def.scope === 'workspace' ? 'workspace' : 'global',
    tool: def.tool,
    label: def.label,
    note: def.note,
    rel: def.absolute ? null : def.pattern,
    ...inspect(abs)
  };
}

function defsByScope(scope: InstructionScope): InstructionFileDef[] {
  return INSTRUCTION_FILES.filter(d => d.scope === scope);
}

export function listWorkspaceFiles(): InstructionFile[] {
  const ws = vscode.workspace.workspaceFolders?.[0];
  if (!ws) return [];
  const root = ws.uri.fsPath;
  return defsByScope('workspace').map(def => defToFile(def, path.join(root, def.pattern)));
}

export function listGlobalFiles(): InstructionFile[] {
  return defsByScope('global').map(def => defToFile(def, def.pattern));
}

export function listPerSkillFiles(skillDir: string): InstructionFile[] {
  const out: InstructionFile[] = [];
  for (const name of PER_SKILL_FILES) {
    const abs = path.join(skillDir, name);
    const i = inspect(abs);
    if (i.exists) {
      out.push({ kind: 'per-skill', tool: 'agents', label: name, note: '', rel: name, ...i });
    }
  }
  return out;
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n}B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)}KB`;
  return `${(n / 1024 / 1024).toFixed(1)}MB`;
}

export function formatAge(ms: number): string {
  if (!ms) return '';
  const d = (Date.now() - ms) / 1000;
  if (d < 60) return `${Math.floor(d)}s ago`;
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}
