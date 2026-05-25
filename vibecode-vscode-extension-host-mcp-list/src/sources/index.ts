import { MCP_SOURCE, SourceId, SourceModule } from './_types';
import userMcpJson from './user-mcp-json';
import workspaceMcpJson from './workspace-mcp-json';
import extensionContributes from './extension-contributes';

export const SOURCES_REGISTRY: Record<SourceId, SourceModule> = {
  [MCP_SOURCE.USER_MCP_JSON]: userMcpJson,
  [MCP_SOURCE.WORKSPACE_MCP_JSON]: workspaceMcpJson,
  [MCP_SOURCE.EXTENSION_CONTRIBUTES]: extensionContributes,
};

export const ALL_SOURCES: readonly SourceModule[] = Object.values(SOURCES_REGISTRY);
