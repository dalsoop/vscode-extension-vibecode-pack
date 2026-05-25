import * as mem from '../memory';
import * as analyzer from '../analyzer';
import * as path from 'path';
import { t } from '../i18n';
import type { DataSource, FetchContext, Group, ItemPayload } from '../types';

function renderFiles(dir: string): ItemPayload[] {
  const files = mem.listMemoryFiles(dir) || [];
  return files.map(fl => {
    const { meta } = mem.parseMemoryEntry(fl.abs);
    const kind = mem.memoryKind(fl.name, meta);
    const sc = analyzer.fileScore(fl.abs);
    return {
      id: fl.abs,
      title: meta.name || fl.name,
      subtitle: meta.description ? meta.description.slice(0, 140) : '',
      meta: `${kind} · ${sc.lines} lines · ${mem.formatBytes(fl.size)} · ${mem.formatAge(fl.mtime)}`,
      path: fl.abs,
      kind,
      score: { pct: sc.pct, grade: sc.grade as any, color: sc.color as any, issues: sc.issues },
      actions: ['open', 'finder']
    };
  });
}

export class MemorySource implements DataSource {
  readonly id = 'memory' as const;
  readonly label = 'Memory';
  readonly desc = 'Per-project memory entries';

  fetch(ctx: FetchContext): Group[] {
    const out: Group[] = [];
    if (ctx.scope === 'this') {
      if (ctx.activeFolderDir) {
        out.push({
          title: t('hub.groups.thisFolder', path.basename(ctx.activeFolderDir)),
          items: renderFiles(mem.memoryDirFor(ctx.activeFolderDir))
        });
      }
      return out;
    }
    if ((ctx.scope === 'all' || ctx.scope === 'workspace') && ctx.workspaceDir) {
      out.push({ title: t('hub.groups.currentWorkspace'), items: renderFiles(mem.memoryDirFor(ctx.workspaceDir)) });
    }
    if (ctx.scope === 'all' || ctx.scope === 'global') {
      const all = mem.listAllProjectMemories();
      out.push({
        title: t('hub.groups.allProjects', all.length),
        items: all.map(p => ({
          id: p.memDir,
          title: p.label,
          subtitle: p.wsPath,
          meta: `${p.count} entries`,
          path: p.memDir,
          actions: ['finder']
        }))
      });
    }
    return out;
  }
}
