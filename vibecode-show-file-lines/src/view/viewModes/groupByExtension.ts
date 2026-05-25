import { VIEW_MODE_GROUP_EXT } from '../../constants';
import type { FileNode, FileStat, GroupNode, ITreeViewMode, TreeNode, ViewCtx } from '../../core/types';

const NO_EXT_LABEL = '(no extension)';

export class GroupByExtension implements ITreeViewMode {
  readonly id = VIEW_MODE_GROUP_EXT;
  readonly labelKey = 'view.mode.groupByExtension';

  build(stats: Iterable<FileStat>, ctx: ViewCtx): TreeNode[] {
    const buckets = new Map<string, FileStat[]>();
    for (const s of stats) {
      const key = s.ext === '' ? NO_EXT_LABEL : s.ext;
      const bucket = buckets.get(key) ?? [];
      bucket.push(s);
      buckets.set(key, bucket);
    }
    const groups: GroupNode[] = [];
    for (const [label, items] of buckets) {
      items.sort((a, b) => b.lines - a.lines);
      const children: FileNode[] = items.map(s => ({
        kind: 'file' as const,
        stat: s,
        warn: s.lines >= ctx.warnThreshold
      }));
      const totalLines = items.reduce((acc, s) => acc + s.lines, 0);
      groups.push({
        kind: 'group',
        label,
        fileCount: items.length,
        totalLines,
        children
      });
    }
    groups.sort((a, b) => b.totalLines - a.totalLines);
    return groups;
  }
}
