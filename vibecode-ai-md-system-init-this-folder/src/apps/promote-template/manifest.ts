import type { AppManifest } from '../_types';

export const manifest: AppManifest = {
  id: 'promoteTemplate',
  title: 'Vibecode - Add Folder as User Template',
  description: 'Pick a folder containing tool markers (.claude, .codex, .cursor, .gemini, …) and save its contents as a new user template under ~/.vibecode-ai-md-system/templates/<name>/<tool>/.',
  icon: 'archive',
  menus: [
    {
      where: 'view/title',
      when: 'view == vibecodeAiMdSystem.templates',
      group: 'navigation@7'
    }
  ]
};
