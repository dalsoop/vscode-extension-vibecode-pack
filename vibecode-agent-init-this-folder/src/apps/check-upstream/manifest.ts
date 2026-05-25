import type { AppManifest } from '../_types';

export const manifest: AppManifest = {
  id: 'checkUpstream',
  title: 'Vibecode Agent - Check Template Upstream',
  description: 'Fetch upstream_url, diff against local template.json, and prompt to Pull or Push (sync logic stubbed).',
  icon: 'cloud',
  menus: [
    {
      where: 'editor/title',
      when: "resourceFilename == 'template.json'",
      group: 'navigation'
    },
    {
      where: 'editor/context',
      when: "resourceFilename == 'template.json'",
      group: '6_rca'
    }
  ]
};
