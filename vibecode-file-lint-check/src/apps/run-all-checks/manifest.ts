import type { AppManifest } from '../_types';

export const manifest: AppManifest = {
  id: 'runAllChecks',
  title: 'Vibecode - Run All File-Lint Checks',
  description: 'Run every check in .vibecode/file-lint/ sequentially.',
  icon: 'run-all',
  menus: [
    {
      where: 'view/title',
      when: 'view == vibecodeFileLint.checks',
      group: 'navigation@1'
    }
  ]
};
