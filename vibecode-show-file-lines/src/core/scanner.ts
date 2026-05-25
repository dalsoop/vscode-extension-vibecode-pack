import * as path from 'path';
import { BINARY_SNIFF_BYTES } from '../constants';
import type {
  IBinaryDetector, IFileSystem, IIgnoreResolver, ILineCache,
  ILineCountStrategy, ILogger, Uri
} from './types';

export interface ScannerDeps {
  fs: IFileSystem;
  cache: ILineCache;
  ignoreResolver: IIgnoreResolver;
  lineCounter: ILineCountStrategy;
  binaryDetector: IBinaryDetector;
  maxFileSizeBytes: number;
  logger: ILogger;
}

export interface ScanOptions {
  onProgress?: (done: number, total: number) => void;
}

export class Scanner {
  constructor(private readonly deps: ScannerDeps) {}

  async scanAll(opts: ScanOptions = {}): Promise<void> {
    const { fs } = this.deps;
    const uris: Uri[] = [];
    for await (const u of fs.findFiles('**/*')) uris.push(u);
    let done = 0;
    for (const u of uris) {
      await this.processOne(u);
      done++;
      opts.onProgress?.(done, uris.length);
    }
  }

  async rescanOne(uri: Uri): Promise<void> {
    await this.processOne(uri);
  }

  private async processOne(uri: Uri): Promise<void> {
    const { fs, cache, ignoreResolver, lineCounter, binaryDetector, maxFileSizeBytes, logger } = this.deps;
    try {
      if (ignoreResolver.isIgnored(uri)) {
        cache.remove(uri);
        return;
      }
      const stat = await fs.stat(uri);
      if (stat.size > maxFileSizeBytes) {
        cache.remove(uri);
        return;
      }
      const content = await fs.readFile(uri);
      const sample = content.length > BINARY_SNIFF_BYTES
        ? content.subarray(0, BINARY_SNIFF_BYTES)
        : content;
      if (binaryDetector.isBinary(uri, sample)) {
        cache.remove(uri);
        return;
      }
      const lines = lineCounter.count(content);
      cache.upsert({
        uri, ext: path.extname(uri.fsPath).toLowerCase(),
        lines, size: stat.size, mtime: stat.mtime
      });
    } catch (err) {
      logger.warn('scan failed', { fsPath: uri.fsPath, err: String(err) });
    }
  }
}
