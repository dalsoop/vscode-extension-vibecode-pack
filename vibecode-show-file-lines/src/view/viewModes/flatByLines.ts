import { VIEW_MODE_FLAT } from '../../constants';
import type { FileStat, ITreeViewMode, TreeNode, ViewCtx } from '../../core/types';

export class FlatByLines implements ITreeViewMode {
  readonly id = VIEW_MODE_FLAT;
  readonly labelKey = 'view.mode.flat';

  build(stats: Iterable<FileStat>, ctx: ViewCtx): TreeNode[] {
    const sorted = [...stats].sort((a, b) => b.lines - a.lines).slice(0, ctx.topN);
    return sorted.map(s => ({
      kind: 'file' as const,
      stat: s,
      warn: s.lines >= ctx.warnThreshold
    }));
  }
}
