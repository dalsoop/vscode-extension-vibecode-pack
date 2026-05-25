import { describe, it, expect } from 'vitest';
import { FilesExcludeSource } from '../../../src/core/ignoreSources/filesExcludeSource';
import { IGNORE_SOURCE_FILES_EXCLUDE } from '../../../src/constants';
import type { IConfigProvider, Disposable } from '../../../src/core/types';

function mockConfig(values: Record<string, unknown>): IConfigProvider {
  return {
    get: <T>(key: string, fallback: T) => (values[key] as T) ?? fallback,
    onChange: (_keys: string[], _cb: () => void): Disposable => ({ dispose() {} })
  };
}

describe('FilesExcludeSource', () => {
  it('has stable id', () => {
    const src = new FilesExcludeSource('/root', mockConfig({}));
    expect(src.id).toBe(IGNORE_SOURCE_FILES_EXCLUDE);
  });

  it('returns empty when files.exclude is empty', async () => {
    const src = new FilesExcludeSource('/root', mockConfig({ 'files.exclude': {} }));
    expect(await src.loadRules()).toEqual([]);
  });

  it('includes only keys whose value is true', async () => {
    const src = new FilesExcludeSource('/root', mockConfig({
      'files.exclude': { '**/.DS_Store': true, '**/Thumbs.db': false, 'node_modules': true }
    }));
    const rules = await src.loadRules();
    expect(rules.map(r => r.pattern).sort()).toEqual(['**/.DS_Store', 'node_modules']);
    expect(rules.every(r => r.baseDirFsPath === '/root')).toBe(true);
  });
});
