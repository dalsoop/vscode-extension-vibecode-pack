import * as path from 'path';
import * as det from '../instructionsDetector';
import * as analyzer from '../analyzer';
import * as mem from '../memory';
import { t } from '../i18n';
import { passesEnabledTools } from './skills';
import type { DataSource, FetchContext, Group, ItemPayload, InstructionFile, TabId, ToolId } from '../types';

// Map InstructionFile.kind onto the canonical scope id used by item.scope.
// 'this' (per-folder instruction sweep) is normalised to 'this folder'.
function scopeForKind(kind: InstructionFile['kind']): 'global' | 'workspace' | 'this folder' | 'extension' {
  if (kind === 'this') return 'this folder';
  if (kind === 'per-skill') return 'extension';
  return kind;
}

function fileToItem(f: InstructionFile): ItemPayload {
  const sc = f.exists
    ? analyzer.fileScore(f.abs)
    : { lines: 0, chars: 0, mtime: 0, pct: 0, grade: '-' as const, color: 'gray' as const, issues: [t('hub.score.missing')] };
  return {
    id: f.abs,
    title: f.label,
    subtitle: f.exists
      ? t('hub.item.linesChars', sc.lines, (sc.chars / 1024).toFixed(1))
      : t('hub.item.missing'),
    meta: f.exists ? [f.hasBlock ? '🔄 synced' : null, mem.formatAge(sc.mtime)].filter(Boolean).join(' · ') : '',
    path: f.abs,
    exists: f.exists,
    hasBlock: f.hasBlock,
    tool: String(f.tool),
    scope: scopeForKind(f.kind),
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
    const matches = (f: InstructionFile): boolean => {
      const baseOk = this.onlyAgent
        ? f.label.toLowerCase().includes('agents')
        : !f.label.toLowerCase().includes('agents');
      if (!baseOk) return false;
      return passesEnabledTools(f.tool as ToolId, ctx.enabledTools);
    };

    // Always emit workspace + global + this-folder groups (scope is now a
    // client-side filter so the chip counts can be computed locally).
    const out: Group[] = [];
    const wsItems = det.listWorkspaceFiles().filter(matches).map(fileToItem);
    if (wsItems.length) out.push({ title: t('hub.groups.workspace'), items: wsItems });
    const globalItems = det.listGlobalFiles().filter(matches).map(fileToItem);
    if (globalItems.length) out.push({ title: t('hub.groups.global'), items: globalItems });
    if (ctx.activeFolderDir) {
      const items = localMdFiles(ctx.activeFolderDir, this.onlyAgent).filter(matches).map(fileToItem);
      if (items.length) out.push({ title: t('hub.groups.thisFolder', path.basename(ctx.activeFolderDir)), items });
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
