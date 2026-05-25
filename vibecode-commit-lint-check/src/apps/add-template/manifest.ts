import type { AppManifest } from '../_types';

export const manifest: AppManifest = {
  id: 'addTemplate',
  title: 'Vibecode - Add Custom Commit Lint Template',
  description:
    'Right-click a folder to scaffold a new user template entry at `<folder>/commit-lint-templates/<timestamp>-<name>/template.json`. Will appear next to bundled templates in the Init picker.',
  icon: 'add',
  menus: [
    {
      where: 'explorer/context',
      when: 'explorerResourceIsFolder',
      group: '6_rca'
    }
  ]
};
