import type { AppManifest } from '../_types';

export const manifest: AppManifest = {
  id: 'runShInTerminal',
  title: 'Vibecode Sh - Run .sh in Terminal',
  description: 'Open an integrated terminal at the script directory and execute the selected .sh file with bash.',
  icon: 'play',
  menus: [
    {
      where: 'explorer/context',
      when: "resourceExtname == '.sh'",
      group: '6_rca'
    },
    {
      where: 'editor/title',
      when: "resourceExtname == '.sh'",
      group: 'navigation'
    },
    {
      where: 'editor/context',
      when: "resourceExtname == '.sh'",
      group: '6_rca'
    }
  ]
};
