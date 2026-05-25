import type { AppManifest } from '../_types';

export const manifest: AppManifest = {
  id: 'renameUserTemplate',
  title: 'Vibecode - Rename User Template',
  description: 'Rename a user-created template folder.',
  icon: 'edit',
  menus: [
    {
      where: 'view/item/context',
      when: 'view == vibecodeAiMdSystem.templates && viewItem == templateItem-user',
      group: '1_modify@1'
    }
  ],
  palette: false
};
