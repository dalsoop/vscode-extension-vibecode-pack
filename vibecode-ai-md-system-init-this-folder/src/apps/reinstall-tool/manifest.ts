import type { AppManifest } from '../_types';

export const manifest: AppManifest = {
  id: 'reinstallTool',
  title: 'Vibecode - Force Re-install (Overwrite)',
  description: 'Re-install a tool variant into the workspace root with overwrite, even if already present.',
  icon: 'sync',
  menus: [
    {
      where: 'view/item/context',
      when: 'view == vibecodeAiMdSystem.templates && viewItem == toolItem-installed',
      group: 'inline'
    }
  ],
  palette: false
};
