import type { AppManifest } from '../_types';

export const manifest: AppManifest = {
  id: 'open',
  title: 'Vibecode Image - Edit',
  description: 'Open the selected image in a webview editor with eyedropper, chroma-key, and crop tools.',
  icon: 'paintcan',
  menus: [
    {
      where: 'explorer/context',
      when:
        "resourceExtname == '.png' || resourceExtname == '.jpg' || resourceExtname == '.jpeg' || " +
        "resourceExtname == '.webp' || resourceExtname == '.gif' || resourceExtname == '.bmp' || " +
        "resourceExtname == '.PNG' || resourceExtname == '.JPG' || resourceExtname == '.JPEG'",
      group: '6_vibecode'
    },
    {
      where: 'editor/title',
      when:
        "resourceExtname == '.png' || resourceExtname == '.jpg' || resourceExtname == '.jpeg' || " +
        "resourceExtname == '.webp' || resourceExtname == '.gif' || resourceExtname == '.bmp' || " +
        "resourceExtname == '.PNG' || resourceExtname == '.JPG' || resourceExtname == '.JPEG'",
      group: 'navigation'
    }
  ]
};
