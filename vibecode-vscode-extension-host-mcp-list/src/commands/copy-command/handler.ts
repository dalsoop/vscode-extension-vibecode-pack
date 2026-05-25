import * as vscode from 'vscode';
import type { CommandContext } from '../_types';
import type { McpServerEntry } from '../../_types';
import { MCP_TRANSPORT } from '../../_types';

export async function handler(ctx: CommandContext): Promise<void> {
  const entry = ctx.args[0] as McpServerEntry | undefined;
  if (!entry) return;
  let text: string;
  if (entry.transport === MCP_TRANSPORT.STDIO) {
    text = [entry.command ?? '', ...(entry.args ?? [])].filter(Boolean).join(' ');
  } else {
    text = entry.url ?? '';
  }
  if (!text) return;
  await vscode.env.clipboard.writeText(text);
  void vscode.window.setStatusBarMessage(vscode.l10n.t('Copied to clipboard.'), 2000);
}
