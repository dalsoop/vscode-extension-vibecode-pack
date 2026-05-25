import type { CommandContext } from '../_types';
import type { McpServerEntry } from '../../_types';
import { DetailPanel } from '../../views/detail-panel/panel';

export async function handler(ctx: CommandContext): Promise<void> {
  const entry = ctx.args[0] as McpServerEntry | undefined;
  if (!entry) return;
  DetailPanel.show(entry);
}
