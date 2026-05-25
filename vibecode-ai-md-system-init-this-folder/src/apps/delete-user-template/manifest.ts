import type { AppManifest } from '../_types';

export const manifest: AppManifest = {
  id: 'deleteUserTemplate',
  title: 'Vibecode - Delete User Template',
  description: 'Remove a user-created template from ~/.vibecode-ai-md-system/templates/. Bundled templates cannot be deleted.',
  icon: 'trash',
  menus: [
    {
      where: 'view/item/context',
      when: 'view == vibecodeAiMdSystem.templates && viewItem == templateItem-user',
      group: 'inline'
    }
  ],
  palette: false
};
