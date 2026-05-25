import { describe, it, expect, vi } from 'vitest';
import { LineignoreSource } from '../../../src/core/ignoreSources/lineignoreSource';
import { IGNORE_SOURCE_LINEIGNORE } from '../../../src/constants';
import type { IFileSystem, Uri } from '../../../src/core/types';

function mockFs(files: Record<string, string>): IFileSystem {
  return {
    readTextFile: vi.fn(async (u: Uri) => {
      if (files[u.fsPath] === undefined) throw new Error('ENOENT');
      return files[u.fsPath];
    }),
    readFile: vi.fn(), stat: vi.fn(), findFiles: vi.fn()
  } as unknown as IFileSystem;
}

describe('LineignoreSource', () => {
  it('has stable id', () => {
    const src = new LineignoreSource('/root', mockFs({}));
    expect(src.id).toBe(IGNORE_SOURCE_LINEIGNORE);
  });

  it('returns empty when .lineignore is absent', async () => {
    const src = new LineignoreSource('/root', mockFs({}));
    expect(await src.loadRules()).toEqual([]);
  });

  it('reads .lineignore patterns relative to workspace root', async () => {
    const fs = mockFs({ '/root/.lineignore': '*.snap\nvendor/\n' });
    const src = new LineignoreSource('/root', fs);
    const rules = await src.loadRules();
    expect(rules.map(r => r.pattern)).toEqual(['*.snap', 'vendor/']);
    expect(rules.every(r => r.baseDirFsPath === '/root')).toBe(true);
  });
});
