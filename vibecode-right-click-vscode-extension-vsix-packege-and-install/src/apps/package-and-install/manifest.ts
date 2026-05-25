import type { AppManifest } from '../_types';

export const manifest: AppManifest = {
  id: 'packageAndInstall',
  title: 'Vibecode - Package & Install VSCode Extension',
  description: 'Package the selected VSCode extension folder as .vsix and install it into the running VSCode in one shot.',
  icon: 'package',
  menus: [
    {
      where: 'explorer/context',
      when: 'explorerResourceIsFolder',
      group: '6_rca@20'
    }
  ]
};
