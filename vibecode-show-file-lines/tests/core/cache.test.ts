import { describe, it, expect, vi } from 'vitest';
import { InMemoryLineCache } from '../../src/core/cache';
import type { FileStat, Uri } from '../../src/core/types';

const uri = (p: string): Uri => ({ fsPath: p, toString: () => `file://${p}` });
const stat = (p: string, lines: number): FileStat => ({
  uri: uri(p), ext: '.ts', lines, size: 100, mtime: 1
});

describe('InMemoryLineCache', () => {
  it('starts empty', () => {
    const c = new InMemoryLineCache();
    expect(c.size()).toBe(0);
    expect([...c.all()]).toEqual([]);
  });

  it('upsert + get round-trips', () => {
    const c = new InMemoryLineCache();
    const s = stat('/a.ts', 42);
    c.upsert(s);
    expect(c.get(uri('/a.ts'))).toEqual(s);
  });

  it('emits added event on first upsert', () => {
    const c = new InMemoryLineCache();
    const cb = vi.fn();
    c.onChange(cb);
    c.upsert(stat('/a.ts', 1));
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({
      added: [expect.objectContaining({ lines: 1 })],
      updated: [],
      removed: []
    }));
  });

  it('emits updated event on second upsert with same uri', () => {
    const c = new InMemoryLineCache();
    c.upsert(stat('/a.ts', 1));
    const cb = vi.fn();
    c.onChange(cb);
    c.upsert(stat('/a.ts', 2));
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({
      added: [],
      updated: [expect.objectContaining({ lines: 2 })],
      removed: []
    }));
  });

  it('emits removed event on remove of present uri', () => {
    const c = new InMemoryLineCache();
    c.upsert(stat('/a.ts', 1));
    const cb = vi.fn();
    c.onChange(cb);
    c.remove(uri('/a.ts'));
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({
      added: [], updated: [],
      removed: [expect.objectContaining({ fsPath: '/a.ts' })]
    }));
    expect(c.size()).toBe(0);
  });

  it('remove of absent uri is a no-op and emits nothing', () => {
    const c = new InMemoryLineCache();
    const cb = vi.fn();
    c.onChange(cb);
    c.remove(uri('/missing.ts'));
    expect(cb).not.toHaveBeenCalled();
  });

  it('clear empties the cache and emits removed for all entries', () => {
    const c = new InMemoryLineCache();
    c.upsert(stat('/a.ts', 1));
    c.upsert(stat('/b.ts', 2));
    const cb = vi.fn();
    c.onChange(cb);
    c.clear();
    expect(c.size()).toBe(0);
    expect(cb).toHaveBeenCalledOnce();
    const arg = cb.mock.calls[0][0];
    expect(arg.removed).toHaveLength(2);
  });

  it('dispose unsubscribes the listener', () => {
    const c = new InMemoryLineCache();
    const cb = vi.fn();
    const sub = c.onChange(cb);
    sub.dispose();
    c.upsert(stat('/a.ts', 1));
    expect(cb).not.toHaveBeenCalled();
  });
});
