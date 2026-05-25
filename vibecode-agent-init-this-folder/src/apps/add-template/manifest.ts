import type { AppManifest } from '../_types';

export const manifest: AppManifest = {
  id: 'addTemplate',
  title: 'Vibecode - Add Agent Template',
  description: 'Sidebar [+] button — creates a new agent template under the first workspace folder.',
  icon: 'add',
  menus: [
    {
      where: 'view/title',
      when: 'view == vibecodeAgentInit.templates',
      group: 'navigation'
    }
  ]
};
