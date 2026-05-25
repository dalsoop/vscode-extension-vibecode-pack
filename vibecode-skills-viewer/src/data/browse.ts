import { getCatalogOrEmpty } from '../catalog';
import { t } from '../i18n';
import type { DataSource, FetchContext, Group, ItemPayload } from '../types';

export class BrowseSource implements DataSource {
  readonly id = 'browse' as const;
  readonly label = 'Browse';
  readonly desc = 'Remote catalog';

  fetch(ctx: FetchContext): Group[] {
    const cat = getCatalogOrEmpty(ctx.extensionPath);
    if (!cat.sources.length) return [];
    return [
      {
        title: t('hub.groups.remoteSources', cat.sources.length),
        items: cat.sources.map(
          (s): ItemPayload => ({
            id: s.id,
            title: s.name,
            subtitle: t('hub.item.subtitleRepoBranch', s.repo, s.branch || 'main'),
            meta: s.tier,
            path: `https://github.com/${s.repo}`,
            actions: ['github']
          })
        )
      }
    ];
  }
}
