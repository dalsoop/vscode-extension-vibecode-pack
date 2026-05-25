import { describe, it, expect } from 'vitest';
import { ExtensionAndNullByteDetector } from '../../../src/core/binaryDetectors/extensionAndNullByteDetector';
import type { Uri } from '../../../src/core/types';

const uri = (fsPath: string): Uri => ({ fsPath, toString: () => `file://${fsPath}` });
const enc = (s: string) => new TextEncoder().encode(s);

describe('ExtensionAndNullByteDetector', () => {
  it('flags known binary extension regardless of sample', () => {
    const d = new ExtensionAndNullByteDetector(['.png'], []);
    expect(d.isBinary(uri('/x/foo.png'), enc('hello'))).toBe(true);
  });

  it('respects additional extensions from settings', () => {
    const d = new ExtensionAndNullByteDetector([], ['.proto']);
    expect(d.isBinary(uri('/x/foo.proto'), enc('text'))).toBe(true);
  });

  it('matches extensions case-insensitively', () => {
    const d = new ExtensionAndNullByteDetector(['.png'], []);
    expect(d.isBinary(uri('/x/foo.PNG'), enc('hi'))).toBe(true);
  });

  it('falls back to null-byte sniff for unknown extension', () => {
    const d = new ExtensionAndNullByteDetector([], []);
    const sample = new Uint8Array([72, 101, 0, 108, 111]); // "He\0lo"
    expect(d.isBinary(uri('/x/foo.unknown'), sample)).toBe(true);
  });

  it('treats text-only sample as non-binary for unknown extension', () => {
    const d = new ExtensionAndNullByteDetector([], []);
    expect(d.isBinary(uri('/x/foo.unknown'), enc('plain text'))).toBe(false);
  });

  it('treats empty file as non-binary', () => {
    const d = new ExtensionAndNullByteDetector([], []);
    expect(d.isBinary(uri('/x/foo.txt'), new Uint8Array())).toBe(false);
  });

  it('handles file without extension via null-byte sniff', () => {
    const d = new ExtensionAndNullByteDetector(['.png'], []);
    expect(d.isBinary(uri('/x/Makefile'), enc('all:\n\techo hi'))).toBe(false);
  });
});
