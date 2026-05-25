import type { CommandManifest } from '../_types';
import { MCP_COMMAND } from '../_types';

export const manifest: CommandManifest = {
  id: MCP_COMMAND.REFRESH,
  title: 'Vibecode MCP List - Refresh',
  icon: 'refresh',
  menus: [
    { where: 'view/title', when: 'view == vibecodeMcpList.tree', group: 'navigation' }
  ]
};
