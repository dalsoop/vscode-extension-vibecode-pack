import type { AppManifest } from '../_types';

export const manifest: AppManifest = {
  id: 'openTemplatesFolder',
  title: 'Vibecode - Open Templates Folder (SSOT)',
  description: 'Reveal the bundled <extension>/templates/ folder in Finder — the single source of truth for template recipes.',
  icon: 'folder-opened',
  menus: [
    {
      where: 'view/title',
      when: 'view == vibecodeAgentInit.templates',
      group: 'navigation@5'
    }
  ]
};
