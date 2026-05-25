import { describe, it, expect, vi } from 'vitest';
import { Scanner } from '../../src/core/scanner';
import { InMemoryLineCache } from '../../src/core/cache';
import { RawNewlineCounter } from '../../src/core/lineCounters/rawNewlineCounter';
import { ExtensionAndNullByteDetector } from '../../src/core/binaryDetectors/extensionAndNullByteDetector';
import type { IFileSystem, IIgnoreResolver, ILogger, Uri } from '../../src/core/types';

const uri = (p: string): Uri => ({ fsPath: p, toString: () => `file://${p}` });
const enc = (s: string) => new TextEncoder().encode(s);

function makeFs(files: Record<string, { content: Uint8Array; size: number; mtime: number }>): IFileSystem {
  return {
    async *findFiles(_inc: string, _exc?: string) {
      for (const k of Object.keys(files)) yield uri(k);
    },
    async stat(u: Uri) { return { size: files[u.fsPath].size, mtime: files[u.fsPath].mtime }; },
    async readFile(u: Uri) { return files[u.fsPath].content; },
    async readTextFile(u: Uri) { return new TextDecoder().decode(files[u.fsPath].content); }
  };
}

const ignoreNone: IIgnoreResolver = {
  isIgnored: () => false, reload: async () => {}, onReload: () => ({ dispose() {} })
};
const ignoreAll: IIgnoreResolver = {
  isIgnored: () => true, reload: async () => {}, onReload: () => ({ dispose() {} })
};
const silentLogger: ILogger = { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} };

describe('Scanner', () => {
  it('indexes a single text file', async () => {
    const cache = new InMemoryLineCache();
    const fs = makeFs({ '/r/a.ts': { content: enc('one\ntwo\n'), size: 8, mtime: 1 } });
    const scanner = new Scanner({
      fs, cache, ignoreResolver: ignoreNone,
      lineCounter: new RawNewlineCounter(),
      binaryDetector: new ExtensionAndNullByteDetector([], []),
      maxFileSizeBytes: 1024, logger: silentLogger
    });
    await scanner.scanAll();
    expect(cache.size()).toBe(1);
    expect(cache.get(uri('/r/a.ts'))?.lines).toBe(2);
    expect(cache.get(uri('/r/a.ts'))?.ext).toBe('.ts');
  });

  it('invokes onProgress for every processed file', async () => {
    const cache = new InMemoryLineCache();
    const fs = makeFs({
      '/r/a.ts': { content: enc('x'), size: 1, mtime: 1 },
      '/r/b.ts': { content: enc('y'), size: 1, mtime: 1 }
    });
    const scanner = new Scanner({
      fs, cache, ignoreResolver: ignoreNone,
      lineCounter: new RawNewlineCounter(),
      binaryDetector: new ExtensionAndNullByteDetector([], []),
      maxFileSizeBytes: 1024, logger: silentLogger
    });
    const onProgress = vi.fn();
    await scanner.scanAll({ onProgress });
    expect(onProgress).toHaveBeenCalledTimes(2);
    expect(onProgress).toHaveBeenLastCalledWith(2, 2);
  });

  it('skips ignored files', async () => {
    const cache = new InMemoryLineCache();
    const fs = makeFs({ '/r/a.ts': { content: enc('x'), size: 1, mtime: 1 } });
    const scanner = new Scanner({
      fs, cache, ignoreResolver: ignoreAll,
      lineCounter: new RawNewlineCounter(),
      binaryDetector: new ExtensionAndNullByteDetector([], []),
      maxFileSizeBytes: 1024, logger: silentLogger
    });
    await scanner.scanAll();
    expect(cache.size()).toBe(0);
  });

  it('skips files larger than the size cap without reading them', async () => {
    const cache = new InMemoryLineCache();
    const readFile = vi.fn(async () => enc('big'));
    const fs: IFileSystem = {
      async *findFiles() { yield uri('/r/big.bin'); },
      async stat() { return { size: 99999, mtime: 1 }; },
      readFile, readTextFile: async () => 'big'
    };
    const scanner = new Scanner({
      fs, cache, ignoreResolver: ignoreNone,
      lineCounter: new RawNewlineCounter(),
      binaryDetector: new ExtensionAndNullByteDetector([], []),
      maxFileSizeBytes: 100, logger: silentLogger
    });
    await scanner.scanAll();
    expect(cache.size()).toBe(0);
    expect(readFile).not.toHaveBeenCalled();
  });

  it('skips binary files detected by extension', async () => {
    const cache = new InMemoryLineCache();
    const fs = makeFs({ '/r/img.png': { content: enc('not really png'), size: 14, mtime: 1 } });
    const scanner = new Scanner({
      fs, cache, ignoreResolver: ignoreNone,
      lineCounter: new RawNewlineCounter(),
      binaryDetector: new ExtensionAndNullByteDetector(['.png'], []),
      maxFileSizeBytes: 1024, logger: silentLogger
    });
    await scanner.scanAll();
    expect(cache.size()).toBe(0);
  });

  it('skips binary files detected by null byte', async () => {
    const cache = new InMemoryLineCache();
    const sample = new Uint8Array([65, 0, 66]);
    const fs = makeFs({ '/r/x.unknown': { content: sample, size: 3, mtime: 1 } });
    const scanner = new Scanner({
      fs, cache, ignoreResolver: ignoreNone,
      lineCounter: new RawNewlineCounter(),
      binaryDetector: new ExtensionAndNullByteDetector([], []),
      maxFileSizeBytes: 1024, logger: silentLogger
    });
    await scanner.scanAll();
    expect(cache.size()).toBe(0);
  });

  it('rescanOne re-counts a single uri', async () => {
    const cache = new InMemoryLineCache();
    const fs = makeFs({ '/r/a.ts': { content: enc('one\ntwo\n'), size: 8, mtime: 1 } });
    const scanner = new Scanner({
      fs, cache, ignoreResolver: ignoreNone,
      lineCounter: new RawNewlineCounter(),
      binaryDetector: new ExtensionAndNullByteDetector([], []),
      maxFileSizeBytes: 1024, logger: silentLogger
    });
    await scanner.rescanOne(uri('/r/a.ts'));
    expect(cache.get(uri('/r/a.ts'))?.lines).toBe(2);
  });
});
