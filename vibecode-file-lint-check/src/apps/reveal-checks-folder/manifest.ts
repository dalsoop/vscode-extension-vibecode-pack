import type { AppManifest } from '../_types';

export const manifest: AppManifest = {
  id: 'revealChecksFolder',
  title: 'Vibecode - Reveal File-Lint Checks Folder',
  description: 'Open .vibecode/file-lint/ in the file explorer.',
  icon: 'folder-opened',
  menus: [
    {
      where: 'view/title',
      when: 'view == vibecodeFileLint.checks',
      group: 'navigation@3'
    }
  ]
};
