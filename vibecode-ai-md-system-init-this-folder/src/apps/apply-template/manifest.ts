import type { AppManifest } from '../_types';

export const manifest: AppManifest = {
  id: 'applyTemplate',
  title: 'Vibecode Agent - Apply Template…',
  description: 'Pick a target parent folder + new folder name, then copy the chosen template.json into it.',
  icon: 'rocket',
  menus: [
    {
      where: 'view/title',
      when: 'view == vibecodeAgentInit.templates',
      group: 'navigation@10'
    }
  ]
};
