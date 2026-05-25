import type { AppManifest } from '../_types';

export const manifest: AppManifest = {
  id: 'openInTerminal',
  title: 'Vibecode - Open Terminal Here',
  description: 'Open a new integrated terminal at the selected folder (or the parent of the selected file).',
  icon: 'terminal',
  menus: [
    { where: 'explorer/context', group: '6_rca' }
  ]
};
