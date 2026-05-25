import { describe, it, expect, vi } from 'vitest';
import { GitignoreSource } from '../../../src/core/ignoreSources/gitignoreSource';
import { IGNORE_SOURCE_GITIGNORE } from '../../../src/constants';
import type { IFileSystem, Uri } from '../../../src/core/types';

function mockFs(files: Record<string, string>): IFileSystem {
  return {
    readTextFile: vi.fn(async (u: Uri) => {
      if (files[u.fsPath] === undefined) throw new Error('ENOENT');
      return files[u.fsPath];
    }),
    readFile: vi.fn(),
    stat: vi.fn(),
    findFiles: vi.fn()
  } as unknown as IFileSystem;
}

describe('GitignoreSource', () => {
  it('has stable id and priority', () => {
    const src = new GitignoreSource('/root', mockFs({}));
    expect(src.id).toBe(IGNORE_SOURCE_GITIGNORE);
    expect(typeof src.priority).toBe('number');
  });

  it('returns empty rule set when no .gitignore exists', async () => {
    const src = new GitignoreSource('/root', mockFs({}));
    expect(await src.loadRules()).toEqual([]);
  });

  it('parses .gitignore at workspace root, skipping comments and blanks', async () => {
    const fs = mockFs({ '/root/.gitignore': 'node_modules\n# comment\n\ndist\n' });
    const src = new GitignoreSource('/root', fs);
    const rules = await src.loadRules();
    expect(rules.map(r => r.pattern)).toEqual(['node_modules', 'dist']);
    expect(rules.every(r => r.baseDirFsPath === '/root')).toBe(true);
  });
});
