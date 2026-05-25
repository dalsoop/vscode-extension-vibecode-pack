import * as path from 'path';
import type { IBinaryDetector, Uri } from '../types';

export class ExtensionAndNullByteDetector implements IBinaryDetector {
  private readonly extSet: Set<string>;

  constructor(
    seedExtensions: readonly string[],
    additionalExtensions: readonly string[]
  ) {
    this.extSet = new Set(
      [...seedExtensions, ...additionalExtensions].map(e => e.toLowerCase())
    );
  }

  isBinary(uri: Uri, sample: Uint8Array): boolean {
    const ext = path.extname(uri.fsPath).toLowerCase();
    if (ext && this.extSet.has(ext)) return true;
    for (let i = 0; i < sample.length; i++) {
      if (sample[i] === 0) return true;
    }
    return false;
  }
}
