import type { AppManifest } from '../_types';
export const manifest: AppManifest = {
  id: 'toggleView',
  title: 'Vibecode - Toggle Line Ranking View',
  description: 'Switch between flat and grouped-by-extension view modes.',
  icon: 'list-tree',
  menus: [{ where: 'view/title', group: 'navigation', when: "view == vibecodeShowFileLines.lineRanking" }]
};
