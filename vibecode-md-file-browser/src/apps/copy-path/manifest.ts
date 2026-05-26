import type { AppManifest } from '../_types';

export const manifest: AppManifest = {
  id: 'copyPath',
  title: 'Vibecode - Copy Markdown Path',
  description: 'Copy the workspace-relative path of the selected Markdown file.',
  icon: 'copy',
  menus: [
    {
      where: 'view/item/context',
      when: 'view == vibecodeMdFileBrowser.files && viewItem == markdownFile',
      group: 'navigation@4'
    }
  ],
  palette: false
};
