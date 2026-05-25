import type { AppManifest } from '../_types';

export const manifest: AppManifest = {
  id: 'refreshChecks',
  title: 'Vibecode - Refresh Commit-Lint Checks',
  description: 'Re-scan .vibecode/code-lint/.',
  icon: 'refresh',
  menus: [
    {
      where: 'view/title',
      when: 'view == vibecodeCommitLint.checks',
      group: 'navigation@2'
    }
  ]
};
