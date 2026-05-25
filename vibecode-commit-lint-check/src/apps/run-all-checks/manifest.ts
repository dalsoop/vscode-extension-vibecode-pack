import type { AppManifest } from '../_types';

export const manifest: AppManifest = {
  id: 'runAllChecks',
  title: 'Vibecode - Run All Commit-Lint Checks',
  description: 'Run every check in .vibecode/code-lint/ sequentially.',
  icon: 'run-all',
  menus: [
    {
      where: 'view/title',
      when: 'view == vibecodeCommitLint.checks',
      group: 'navigation@1'
    }
  ]
};
