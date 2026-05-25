import type { AppManifest } from '../_types';

export const manifest: AppManifest = {
  id: 'openFolderInNewWindow',
  title: 'Vibecode Files - Open Folder in New VSCode Window',
  description: 'Open the selected folder (or its parent if a file is selected) in a new VSCode window.',
  icon: 'empty-window',
  menus: [
    {
      where: 'explorer/context',
      when: 'explorerResourceIsFolder',
      group: '6_rca'
    }
  ]
};
