import type { AppManifest } from '../_types';

export const manifest: AppManifest = {
  id: 'revealInExplorer',
  title: 'Vibecode - Reveal Markdown File',
  description: 'Reveal the selected Markdown file in the VSCode Explorer.',
  icon: 'folder-opened',
  menus: [
    {
      where: 'view/item/context',
      when: 'view == vibecodeMdFileBrowser.files && viewItem == markdownFile',
      group: 'navigation@3'
    }
  ],
  palette: false
};
