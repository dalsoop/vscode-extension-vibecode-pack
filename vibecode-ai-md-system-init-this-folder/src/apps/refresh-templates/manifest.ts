import type { AppManifest } from '../_types';

export const manifest: AppManifest = {
  id: 'refreshTemplates',
  title: 'Vibecode - Refresh Agent Templates',
  description: 'Sidebar refresh button — re-scans the workspace for template.json files.',
  icon: 'refresh',
  menus: [
    {
      where: 'view/title',
      when: 'view == vibecodeAiMdSystem.templates',
      group: 'navigation'
    }
  ]
};
