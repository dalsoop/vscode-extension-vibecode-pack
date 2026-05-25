import type { AppManifest } from '../_types';

export const manifest: AppManifest = {
  id: 'openHtmlInBrowser',
  title: 'Vibecode Files - Open in Default Browser',
  description: 'Open the selected HTML/SVG/PDF file in the system default browser.',
  icon: 'globe',
  menus: [
    {
      where: 'explorer/context',
      when: "resourceExtname =~ /\\.(html?|svg|pdf)$/",
      group: '6_rca'
    },
    {
      where: 'editor/title/context',
      when: "resourceExtname =~ /\\.(html?|svg|pdf)$/",
      group: '6_rca'
    }
  ]
};
