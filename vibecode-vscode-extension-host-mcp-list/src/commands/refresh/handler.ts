import type { CommandContext } from '../_types';

export async function handler(ctx: CommandContext): Promise<void> {
  await ctx.state.refreshAll();
}
