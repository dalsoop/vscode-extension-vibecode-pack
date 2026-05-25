import type { CommandManifest } from '../_types';
import { MCP_COMMAND } from '../_types';

export const manifest: CommandManifest = {
  id: MCP_COMMAND.OPEN_WORKSPACE_MCP_JSON,
  title: 'Vibecode MCP List - Open Workspace mcp.json',
  icon: 'folder',
  menus: [
    { where: 'view/title', when: 'view == vibecodeMcpList.tree && workspaceFolderCount > 0', group: '1_open' }
  ]
};
