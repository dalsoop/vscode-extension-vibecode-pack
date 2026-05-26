import type { AppManifest } from '../_types';

export const manifest: AppManifest = {
  id: 'openPreview',
  title: 'Vibecode - Open Markdown Preview',
  description: 'Open the rendered Markdown preview for the selected file.',
  icon: 'open-preview',
  menus: [
    {
      where: 'view/item/context',
      when: 'view == vibecodeMdFileBrowser.files && viewItem == markdownFile',
      group: 'inline@1'
    }
  ]
};
