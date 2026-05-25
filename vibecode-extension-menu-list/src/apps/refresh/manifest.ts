import type { AppManifest } from '../_types';

export const manifest: AppManifest = {
  id: 'refresh',
  title: 'Vibecode - Refresh Extension List',
  description:
    'Reload the catalog of installed vibecode-* extensions and their commands. Triggered by the refresh icon in the Vibecode sidebar title bar.',
  icon: 'refresh',
  menus: [
    {
      where: 'view/title',
      when: "view == 'vibecodeMenuList.extensions'",
      group: 'navigation'
    }
  ]
};
