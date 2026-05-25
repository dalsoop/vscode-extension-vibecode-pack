import type { AppManifest } from '../_types';

export const manifest: AppManifest = {
  id: 'copyAbsolutePath',
  title: 'Vibecode - Copy Absolute Path',
  description: 'Copy the absolute filesystem path of the selected file or folder to clipboard.',
  icon: 'clippy',
  menus: [
    { where: 'explorer/context', group: '6_rca' },
    { where: 'editor/title/context', group: '6_rca' }
  ]
};
