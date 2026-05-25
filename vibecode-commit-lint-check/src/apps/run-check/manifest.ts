import type { AppManifest } from '../_types';

export const manifest: AppManifest = {
  id: 'runCheck',
  title: 'Vibecode - Run Commit-Lint Check',
  description: 'Run a single check by id (used by tree right-click).',
  icon: 'play',
  menus: [
    {
      where: 'view/item/context',
      when: 'view == vibecodeCommitLint.checks && viewItem == commitLintCheck',
      group: 'inline'
    }
  ],
  palette: false
};
