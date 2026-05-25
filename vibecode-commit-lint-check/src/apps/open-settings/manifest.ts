import type { AppManifest } from '../_types';

export const manifest: AppManifest = {
  id: 'openSettings',
  title: 'Vibecode - Open Commit Lint Settings',
  description: 'Open VSCode Settings filtered to this extension.',
  icon: 'settings-gear',
  menus: [
    {
      where: 'view/title',
      when: 'view == vibecodeCommitLint.templates',
      group: 'navigation@9'
    }
  ]
};
