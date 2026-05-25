import type { CacheChange, Disposable, FileStat, ILineCache, Uri } from './types';

export class InMemoryLineCache implements ILineCache {
  private readonly store = new Map<string, FileStat>();
  private readonly listeners = new Set<(c: CacheChange) => void>();

  get(uri: Uri): FileStat | undefined {
    return this.store.get(uri.fsPath);
  }

  upsert(stat: FileStat): void {
    const key = stat.uri.fsPath;
    const existed = this.store.has(key);
    this.store.set(key, stat);
    this.emit({
      added: existed ? [] : [stat],
      updated: existed ? [stat] : [],
      removed: []
    });
  }

  remove(uri: Uri): void {
    const key = uri.fsPath;
    if (!this.store.has(key)) return;
    this.store.delete(key);
    this.emit({ added: [], updated: [], removed: [uri] });
  }

  clear(): void {
    if (this.store.size === 0) return;
    const removed = [...this.store.values()].map(s => s.uri);
    this.store.clear();
    this.emit({ added: [], updated: [], removed });
  }

  all(): Iterable<FileStat> {
    return this.store.values();
  }

  size(): number {
    return this.store.size;
  }

  onChange(cb: (c: CacheChange) => void): Disposable {
    this.listeners.add(cb);
    return { dispose: () => this.listeners.delete(cb) };
  }

  private emit(change: CacheChange): void {
    for (const l of this.listeners) l(change);
  }
}
