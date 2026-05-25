import type { AppManifest } from '../_types';

export const manifest: AppManifest = {
  id: 'checkLastCommit',
  title: 'Vibecode - Check Last Commit Message',
  description:
    'Run `npx commitlint --from HEAD~1 --to HEAD` in the integrated terminal at the workspace root (or the chosen folder if invoked via right-click).',
  icon: 'check-all',
  menus: [
    {
      where: 'editor/title',
      when: "resourceFilename == 'COMMIT_EDITMSG'",
      group: 'navigation'
    }
  ]
};
