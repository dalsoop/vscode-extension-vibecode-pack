import type { AppManifest } from '../_types';

export const manifest: AppManifest = {
  id: 'initTemplateHere',
  title: 'Vibecode Agent - Init Template Here',
  description: 'Create a new agent template entry under <folder>/templates/{timestamp}-{name}/template.json.',
  icon: 'add',
  menus: [
    {
      where: 'explorer/context',
      when: 'explorerResourceIsFolder',
      group: '6_rca'
    }
  ]
};
