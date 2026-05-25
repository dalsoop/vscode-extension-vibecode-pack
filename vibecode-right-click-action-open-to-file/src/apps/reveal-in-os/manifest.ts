import type { AppManifest } from '../_types';

export const manifest: AppManifest = {
  id: 'revealInOS',
  title: 'Vibecode Files - Reveal in Finder / Explorer',
  description: 'Reveal the selected file or folder in the OS file manager.',
  icon: 'folder-opened',
  menus: [
    { where: 'explorer/context', group: '6_rca@30' },
    { where: 'editor/title/context', group: '6_rca@30' }
  ]
};
