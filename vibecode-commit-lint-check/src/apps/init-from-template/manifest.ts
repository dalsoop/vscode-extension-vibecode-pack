import type { AppManifest } from '../_types';

export const manifest: AppManifest = {
  id: 'initFromTemplate',
  title: 'Vibecode - Init Commit Lint From Template',
  description:
    'Right-click a folder, pick a bundled commitlint template (Conventional, PHP/Laravel, Node, Python, or a user-defined one) and scaffold the config files into that folder.',
  icon: 'rocket',
  menus: [
    {
      where: 'explorer/context',
      when: 'explorerResourceIsFolder',
      group: '6_rca'
    }
  ]
};
