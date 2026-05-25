import type { McpState } from '../state';

export const MCP_COMMAND = {
  REFRESH: 'refresh',
  OPEN_USER_MCP_JSON: 'openUserMcpJson',
  OPEN_WORKSPACE_MCP_JSON: 'openWorkspaceMcpJson',
  OPEN_DETAIL: 'openDetail',
  COPY_COMMAND: 'copyCommand',
} as const;
export type CommandId = typeof MCP_COMMAND[keyof typeof MCP_COMMAND];

export type CommandMenuLocation = 'view/title' | 'view/item/context' | 'commandPalette';

export interface CommandMenuContribution {
  where: CommandMenuLocation;
  when?: string;
  group?: string;
}

export interface CommandManifest {
  id: CommandId;
  title: string;
  icon?: string;
  menus?: CommandMenuContribution[];
  palette?: boolean;
}

export interface CommandContext {
  state: McpState;
  args: unknown[];
}

export interface CommandModule {
  manifest: CommandManifest;
  handler: (ctx: CommandContext) => unknown | Promise<unknown>;
}
