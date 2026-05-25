import type { CommandModule, CommandId } from './_types';
import { MCP_COMMAND } from './_types';
import refresh from './refresh';
import openUserMcpJson from './open-user-mcp-json';
import openWorkspaceMcpJson from './open-workspace-mcp-json';
import openDetail from './open-detail';
import copyCommand from './copy-command';

export const COMMANDS_REGISTRY: Record<CommandId, CommandModule> = {
  [MCP_COMMAND.REFRESH]: refresh,
  [MCP_COMMAND.OPEN_USER_MCP_JSON]: openUserMcpJson,
  [MCP_COMMAND.OPEN_WORKSPACE_MCP_JSON]: openWorkspaceMcpJson,
  [MCP_COMMAND.OPEN_DETAIL]: openDetail,
  [MCP_COMMAND.COPY_COMMAND]: copyCommand,
};

export const ALL_COMMANDS: readonly CommandModule[] = Object.values(COMMANDS_REGISTRY);
