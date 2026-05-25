import type { AppManifest } from '../_types';

export const manifest: AppManifest = {
  id: 'applyTemplate',
  title: 'Vibecode - Install Selected Tool Variants',
  description: 'Read sidebar-checked template/tool pairs, pick a target folder, and recursively copy each variant in. Button is hidden until at least one item is checked.',
  icon: 'rocket',
  menus: [
    {
      where: 'view/title',
      when: 'view == vibecodeAiMdSystem.templates && vibecodeAiMdSystem.hasSelection',
      group: 'navigation@10'
    }
  ]
};
