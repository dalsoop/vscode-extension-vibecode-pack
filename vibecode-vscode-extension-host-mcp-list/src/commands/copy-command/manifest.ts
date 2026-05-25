import type { CommandManifest } from '../_types';
import { MCP_COMMAND } from '../_types';

export const manifest: CommandManifest = {
  id: MCP_COMMAND.COPY_COMMAND,
  title: 'Vibecode MCP List - Copy Command',
  icon: 'clippy',
  menus: [
    { where: 'view/item/context', when: 'view == vibecodeMcpList.tree && viewItem == mcpServerItem', group: 'inline' }
  ]
};
