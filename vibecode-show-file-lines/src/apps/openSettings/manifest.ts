import type { AppManifest } from '../_types';
export const manifest: AppManifest = {
  id: 'openSettings',
  title: 'Vibecode - Open Line Ranking Settings',
  description: 'Open VSCode settings filtered to this extension.',
  icon: 'gear',
  menus: [{ where: 'view/title', group: 'navigation', when: "view == vibecodeShowFileLines.lineRanking" }]
};
