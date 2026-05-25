import type { AppManifest } from '../_types';

export const manifest: AppManifest = {
  id: 'revealChecksFolder',
  title: 'Vibecode - Reveal Commit-Lint Checks Folder',
  description: 'Open .vibecode/code-lint/ in the file explorer.',
  icon: 'folder-opened',
  menus: [
    {
      where: 'view/title',
      when: 'view == vibecodeCommitLint.checks',
      group: 'navigation@3'
    }
  ]
};
