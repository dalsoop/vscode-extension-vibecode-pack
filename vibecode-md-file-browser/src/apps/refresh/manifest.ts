import type { AppManifest } from '../_types';

export const manifest: AppManifest = {
  id: 'refresh',
  title: 'Vibecode - Refresh Markdown Files',
  description: 'Re-scan the workspace for Markdown documents.',
  icon: 'refresh',
  menus: [
    {
      where: 'view/title',
      when: 'view == vibecodeMdFileBrowser.files',
      group: 'navigation@1'
    }
  ]
};
