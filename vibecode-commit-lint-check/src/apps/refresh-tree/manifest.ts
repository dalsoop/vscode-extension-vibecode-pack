import type { AppManifest } from '../_types';

export const manifest: AppManifest = {
  id: 'refreshTree',
  title: 'Vibecode - Refresh Commit Lint Templates',
  description: 'Re-scan bundled and user commit-lint templates in the sidebar tree view.',
  icon: 'refresh',
  menus: [
    {
      where: 'view/title',
      when: 'view == vibecodeCommitLint.templates',
      group: 'navigation'
    }
  ]
};
