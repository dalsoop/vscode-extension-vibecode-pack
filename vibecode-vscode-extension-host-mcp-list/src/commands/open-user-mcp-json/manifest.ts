import type { CommandManifest } from '../_types';
import { MCP_COMMAND } from '../_types';

export const manifest: CommandManifest = {
  id: MCP_COMMAND.OPEN_USER_MCP_JSON,
  title: 'Vibecode MCP List - Open User mcp.json',
  icon: 'file',
  menus: [
    { where: 'view/title', when: 'view == vibecodeMcpList.tree', group: '1_open' }
  ]
};
