import { describe, it, expect, vi } from 'vitest';
import { IgnoreResolver } from '../../src/core/ignoreResolver';
import type { IIgnoreSource, IgnoreRule, Uri } from '../../src/core/types';

const uri = (p: string): Uri => ({ fsPath: p, toString: () => `file://${p}` });

function source(id: string, priority: number, rules: IgnoreRule[]): IIgnoreSource {
  return {
    id, priority,
    loadRules: vi.fn(async () => rules)
  };
}

describe('IgnoreResolver', () => {
  it('returns false for any uri before reload()', () => {
    const r = new IgnoreResolver('/root', []);
    expect(r.isIgnored(uri('/root/a.ts'))).toBe(false);
  });

  it('matches a simple pattern from a single source after reload', async () => {
    const r = new IgnoreResolver('/root', [
      source('s1', 10, [{ pattern: 'node_modules', baseDirFsPath: '/root' }])
    ]);
    await r.reload();
    expect(r.isIgnored(uri('/root/node_modules/foo.js'))).toBe(true);
    expect(r.isIgnored(uri('/root/src/foo.ts'))).toBe(false);
  });

  it('a file is ignored if ANY active source ignores it (union semantics)', async () => {
    const r = new IgnoreResolver('/root', [
      source('a', 10, [{ pattern: 'dist', baseDirFsPath: '/root' }]),
      source('b', 20, [{ pattern: '*.snap', baseDirFsPath: '/root' }])
    ]);
    await r.reload();
    expect(r.isIgnored(uri('/root/dist/x.js'))).toBe(true);
    expect(r.isIgnored(uri('/root/x.snap'))).toBe(true);
    expect(r.isIgnored(uri('/root/src/main.ts'))).toBe(false);
  });

  it('reload() refreshes rules from sources', async () => {
    let current: IgnoreRule[] = [{ pattern: 'a', baseDirFsPath: '/root' }];
    const src: IIgnoreSource = {
      id: 's', priority: 10,
      loadRules: async () => current
    };
    const r = new IgnoreResolver('/root', [src]);
    await r.reload();
    expect(r.isIgnored(uri('/root/a/x'))).toBe(true);
    current = [{ pattern: 'b', baseDirFsPath: '/root' }];
    await r.reload();
    expect(r.isIgnored(uri('/root/a/x'))).toBe(false);
    expect(r.isIgnored(uri('/root/b/y'))).toBe(true);
  });

  it('emits onReload after reload completes', async () => {
    const r = new IgnoreResolver('/root', []);
    const cb = vi.fn();
    r.onReload(cb);
    await r.reload();
    expect(cb).toHaveBeenCalledOnce();
  });

  it('files outside workspaceRoot are never ignored', async () => {
    const r = new IgnoreResolver('/root', [
      source('s', 10, [{ pattern: '*', baseDirFsPath: '/root' }])
    ]);
    await r.reload();
    expect(r.isIgnored(uri('/other/x.ts'))).toBe(false);
  });
});
