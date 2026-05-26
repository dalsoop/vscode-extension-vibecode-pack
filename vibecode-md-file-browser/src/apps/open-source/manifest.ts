import type { AppManifest } from '../_types';

export const manifest: AppManifest = {
  id: 'openSource',
  title: 'Vibecode - Open Markdown Source',
  description: 'Open the source editor for the selected Markdown file.',
  icon: 'go-to-file',
  menus: [
    {
      where: 'view/item/context',
      when: 'view == vibecodeMdFileBrowser.files && viewItem == markdownFile',
      group: 'navigation@2'
    }
  ]
};
