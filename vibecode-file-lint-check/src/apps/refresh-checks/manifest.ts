import type { AppManifest } from '../_types';

export const manifest: AppManifest = {
  id: 'refreshChecks',
  title: 'Vibecode - Refresh File-Lint Checks',
  description: 'Re-scan .vibecode/file-lint/.',
  icon: 'refresh',
  menus: [
    {
      where: 'view/title',
      when: 'view == vibecodeFileLint.checks',
      group: 'navigation@2'
    }
  ]
};
