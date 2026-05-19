import { getCatalogOrEmpty } from '../catalog';
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
        title: `Remote Sources (${cat.sources.length})`,
        items: cat.sources.map(
          (s): ItemPayload => ({
            id: s.id,
            title: s.name,
            subtitle: `${s.repo}@${s.branch || 'main'}`,
            meta: s.tier,
            path: `https://github.com/${s.repo}`,
            actions: ['github']
          })
        )
      }
    ];
  }
}
