import * as path from 'path';
import * as det from '../instructionsDetector';
import * as analyzer from '../analyzer';
import * as mem from '../memory';
import { TOOL_FILE_MATCHERS } from './constants';
import type { DataSource, FetchContext, Group, ItemPayload, InstructionFile, TabId, ToolId } from '../types';

function fileToItem(f: InstructionFile): ItemPayload {
  const sc = f.exists
    ? analyzer.fileScore(f.abs)
    : { lines: 0, chars: 0, mtime: 0, pct: 0, grade: '-' as const, color: 'gray' as const, issues: ['Missing'] };
  return {
    id: f.abs,
    title: f.label,
    subtitle: f.exists ? `${sc.lines} lines · ${(sc.chars / 1024).toFixed(1)}KB` : '✕ missing',
    meta: f.exists ? [f.hasBlock ? '🔄 synced' : null, mem.formatAge(sc.mtime)].filter(Boolean).join(' · ') : '',
    path: f.abs,
    exists: f.exists,
    hasBlock: f.hasBlock,
    tool: String(f.tool),
    score: { pct: sc.pct, grade: sc.grade as any, color: sc.color as any, issues: sc.issues },
    actions: f.exists ? ['open', 'sync', 'finder'] : ['create']
  };
}

function localMdFiles(dir: string, onlyAgent: boolean): InstructionFile[] {
  const names = onlyAgent ? ['AGENTS.md'] : ['CLAUDE.md', 'GEMINI.md', '.cursorrules', '.windsurfrules', '.clinerules'];
  const out: InstructionFile[] = [];
  for (const name of names) {
    const abs = path.join(dir, name);
    const i = det.inspect(abs);
    const fileTool: ToolId =
      name === 'AGENTS.md'
        ? 'codex'
        : name === 'GEMINI.md'
          ? 'gemini'
          : name === 'CLAUDE.md'
            ? 'claude'
            : name === '.cursorrules'
              ? 'cursor'
              : name === '.windsurfrules'
                ? 'windsurf'
                : 'cline';
    out.push({ kind: 'this', tool: fileTool, label: name, note: '', rel: name, ...i });
  }
  return out;
}

class MdSource implements DataSource {
  constructor(
    readonly id: TabId,
    readonly label: string,
    readonly desc: string,
    private readonly onlyAgent: boolean
  ) {}

  fetch(ctx: FetchContext): Group[] {
    const toolMatch = TOOL_FILE_MATCHERS[ctx.tool];
    const matches = (f: InstructionFile): boolean => {
      const baseOk = this.onlyAgent
        ? f.label.toLowerCase().includes('agents')
        : !f.label.toLowerCase().includes('agents');
      if (!baseOk) return false;
      if (ctx.tool === 'all') return true;
      return toolMatch ? toolMatch(f) : f.tool === ctx.tool;
    };

    const out: Group[] = [];
    if (ctx.scope === 'this') {
      if (ctx.activeFolderDir) {
        const items = localMdFiles(ctx.activeFolderDir, this.onlyAgent).filter(matches).map(fileToItem);
        out.push({ title: `This Folder · ${path.basename(ctx.activeFolderDir)}`, items });
      }
    } else {
      if (ctx.scope === 'all' || ctx.scope === 'workspace') {
        const items = det.listWorkspaceFiles().filter(matches).map(fileToItem);
        if (items.length) out.push({ title: 'Workspace', items });
      }
      if (ctx.scope === 'all' || ctx.scope === 'global') {
        const items = det.listGlobalFiles().filter(matches).map(fileToItem);
        if (items.length) out.push({ title: 'Global', items });
      }
    }
    return out;
  }
}

export class RootMdSource extends MdSource {
  constructor() {
    super('rootmd', 'Root MD', 'CLAUDE.md / .cursorrules / etc.', false);
  }
}

export class AgentMdSource extends MdSource {
  constructor() {
    super('agent', 'AGENTS.md', 'Agent manifests', true);
  }
}
