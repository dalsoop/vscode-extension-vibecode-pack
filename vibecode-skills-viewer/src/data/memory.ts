import * as mem from '../memory';
import * as analyzer from '../analyzer';
import * as path from 'path';
import { t } from '../i18n';
import type { DataSource, FetchContext, Group, ItemPayload } from '../types';

function renderFiles(dir: string, scope: 'global' | 'workspace' | 'this folder'): ItemPayload[] {
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
      scope,
      score: { pct: sc.pct, grade: sc.grade as any, color: sc.color as any, issues: sc.issues },
      actions: ['open', 'finder']
    };
  });
}

export class MemorySource implements DataSource {
  readonly id = 'memory' as const;
  readonly label = 'MEMORY.md';
  readonly desc = 'Per-project memory entries';

  // Always emit every group (scope is client-side filter for chip counts).
  fetch(ctx: FetchContext): Group[] {
    const out: Group[] = [];
    if (ctx.workspaceDir) {
      const items = renderFiles(mem.memoryDirFor(ctx.workspaceDir), 'workspace');
      if (items.length) out.push({ title: t('hub.groups.currentWorkspace'), items });
    }
    const all = mem.listAllProjectMemories();
    if (all.length) {
      out.push({
        title: t('hub.groups.allProjects', all.length),
        items: all.map(p => ({
          id: p.memDir,
          title: p.label,
          subtitle: p.wsPath,
          meta: `${p.count} entries`,
          path: p.memDir,
          scope: 'global' as const,
          actions: ['finder']
        }))
      });
    }
    if (ctx.activeFolderDir) {
      const items = renderFiles(mem.memoryDirFor(ctx.activeFolderDir), 'this folder');
      if (items.length) {
        out.push({ title: t('hub.groups.thisFolder', path.basename(ctx.activeFolderDir)), items });
      }
    }
    return out;
  }
}
