import type { AppManifest } from '../_types';

export const manifest: AppManifest = {
  id: 'revealTemplateSource',
  title: 'Vibecode - Reveal Template Source',
  description: 'Reveal the template (or tool variant) folder in Finder.',
  icon: 'folder-opened',
  menus: [
    {
      where: 'view/item/context',
      when: "view == vibecodeAiMdSystem.templates && viewItem =~ /^(templateItem|toolItem)/",
      group: '9_reveal@1'
    }
  ],
  palette: false
};
