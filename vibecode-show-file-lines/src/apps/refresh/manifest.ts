import type { AppManifest } from '../_types';
export const manifest: AppManifest = {
  id: 'refresh',
  title: 'Vibecode - Refresh Line Ranking',
  description: 'Re-scan the workspace and rebuild the line-count cache.',
  icon: 'refresh',
  menus: [{ where: 'view/title', group: 'navigation', when: "view == vibecodeShowFileLines.lineRanking" }]
};
