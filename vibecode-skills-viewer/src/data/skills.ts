import { collectAllSkills, collectSkillsUnder } from '../sources';
import * as analyzer from '../analyzer';
import * as mem from '../memory';
import * as state from '../state';
import { readFolderTree } from './folderTree';
import type { DataSource, FetchContext, Group, ItemPayload, Skill, ToolId } from '../types';

// Tool ids that aren't user-configurable tools — they're meta-buckets driven
// by other settings and always pass through.
const NON_USER_TOOLS = new Set<string>(['extension', 'custom']);

export function passesEnabledTools(tool: ToolId | string | undefined, enabled: ReadonlySet<string>): boolean {
  if (!tool || NON_USER_TOOLS.has(tool)) return true;
  return enabled.has(tool);
}

export class SkillSource implements DataSource {
  readonly id = 'skill' as const;
  readonly label = 'SKILL.md';
  readonly desc = 'Skills';

  fetch(ctx: FetchContext): Group[] {
    // Scope is now a client-side filter (so chip counts can be computed
    // without a round-trip). We always return everything: standard global +
    // workspace + extension + custom roots, PLUS anything found under the
    // active folder if there is one (so ad-hoc skill dirs still appear under
    // the "This Folder" chip).
    const merged: Skill[] = [...collectAllSkills({})];
    if (ctx.activeFolderDir) {
      const seen = new Set(merged.map(s => s.dir));
      for (const s of collectSkillsUnder(ctx.activeFolderDir)) {
        if (!seen.has(s.dir)) merged.push(s);
      }
    }
    const items: Skill[] = merged.filter(it => passesEnabledTools(it.source.tool, ctx.enabledTools));

    const dupMap = analyzer.buildDupMap(collectAllSkills({}));
    const groups: Record<string, ItemPayload[]> = {};

    for (const it of items) {
      const key = `${it.source.label} · ${it.source.scope}`;
      const sc = analyzer.score({ name: it.name, dir: it.dir, mdPath: it.info?.mdPath }, { dupMap });
      const children = readFolderTree(it.dir);
      (groups[key] = groups[key] || []).push({
        id: it.dir,
        title: it.name,
        subtitle: it.info?.description ? it.info.description.slice(0, 140) : '',
        meta: [
          it.info?.frontmatterError ? `⚠ YAML: ${it.info.frontmatterError.message.slice(0, 80)}` : '',
          (it.info?.categories || []).join(' · '),
          sc.chars ? `${(sc.chars / 1024).toFixed(1)}KB` : '',
          sc.mtime ? mem.formatAge(sc.mtime) : ''
        ]
          .filter(Boolean)
          .join(' · '),
        badge: it.info?.frontmatterError ? '⚠' : ctx.favorites.has(it.dir) ? '★' : state.isNew(it.dir) ? 'NEW' : '',
        path: it.dir,
        mdPath: it.info?.mdPath,
        tool: it.source.tool,
        scope: it.source.scope,
        kind: 'skill',
        readOnly: !!it.source.readOnly,
        score: { pct: sc.pct, grade: sc.grade, color: sc.color, axes: sc.axes, issues: sc.issues },
        metric: sc.lines ? { count: sc.lines, unit: 'lines' } : undefined,
        actions: ['open', 'preview', 'fav', 'finder'],
        children: children.length ? children : undefined
      });
    }

    for (const k of Object.keys(groups)) {
      groups[k].sort((a, b) => (b.score?.pct ?? 0) - (a.score?.pct ?? 0));
    }
    return Object.entries(groups).map(([title, items]) => ({ title, items }));
  }
}
