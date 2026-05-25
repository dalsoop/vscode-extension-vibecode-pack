import { collectAllSkills, collectSkillsUnder } from '../sources';
import * as analyzer from '../analyzer';
import * as mem from '../memory';
import * as state from '../state';
import type { DataSource, FetchContext, Group, ItemPayload, Skill, ToolId } from '../types';

function passesScope(srcScope: string, scope: FetchContext['scope']): boolean {
  if (scope === 'all') return true;
  if (scope === 'global') return srcScope === 'global';
  if (scope === 'workspace') return srcScope === 'workspace';
  return false;
}

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
    let items: Skill[] =
      ctx.scope === 'this'
        ? ctx.activeFolderDir
          ? collectSkillsUnder(ctx.activeFolderDir)
          : []
        : collectAllSkills({}).filter(it => passesScope(it.source.scope, ctx.scope));

    items = items.filter(it => passesEnabledTools(it.source.tool, ctx.enabledTools));

    const dupMap = analyzer.buildDupMap(collectAllSkills({}));
    const groups: Record<string, ItemPayload[]> = {};

    for (const it of items) {
      const key = `${it.source.label} · ${it.source.scope}`;
      const sc = analyzer.score({ name: it.name, dir: it.dir, mdPath: it.info?.mdPath }, { dupMap });
      (groups[key] = groups[key] || []).push({
        id: it.dir,
        title: it.name,
        subtitle: it.info?.description ? it.info.description.slice(0, 140) : '',
        meta: [
          it.info?.frontmatterError ? `⚠ YAML: ${it.info.frontmatterError.message.slice(0, 80)}` : '',
          (it.info?.categories || []).join(' · '),
          sc.lines ? `${sc.lines} lines` : '',
          sc.chars ? `${(sc.chars / 1024).toFixed(1)}KB` : '',
          sc.mtime ? mem.formatAge(sc.mtime) : ''
        ]
          .filter(Boolean)
          .join(' · '),
        badge: it.info?.frontmatterError ? '⚠' : ctx.favorites.has(it.dir) ? '★' : state.isNew(it.dir) ? 'NEW' : '',
        path: it.dir,
        mdPath: it.info?.mdPath,
        tool: it.source.tool,
        readOnly: !!it.source.readOnly,
        score: { pct: sc.pct, grade: sc.grade, color: sc.color, axes: sc.axes, issues: sc.issues },
        actions: ['open', 'preview', 'fav', 'finder']
      });
    }

    for (const k of Object.keys(groups)) {
      groups[k].sort((a, b) => (b.score?.pct ?? 0) - (a.score?.pct ?? 0));
    }
    return Object.entries(groups).map(([title, items]) => ({ title, items }));
  }
}
