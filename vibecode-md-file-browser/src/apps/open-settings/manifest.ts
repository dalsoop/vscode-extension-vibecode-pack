import type { AppManifest } from '../_types';

export const manifest: AppManifest = {
  id: 'openSettings',
  title: 'Vibecode - Open Markdown Browser Settings',
  description: 'Open VSCode settings filtered to this extension.',
  icon: 'gear',
  menus: [
    {
      where: 'view/title',
      when: 'view == vibecodeMdFileBrowser.files',
      group: 'navigation@9'
    }
  ]
};
