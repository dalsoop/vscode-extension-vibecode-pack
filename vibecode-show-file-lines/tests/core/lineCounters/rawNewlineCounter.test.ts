import { describe, it, expect } from 'vitest';
import { RawNewlineCounter } from '../../../src/core/lineCounters/rawNewlineCounter';
import { LINE_COUNTER_RAW_NEWLINE } from '../../../src/constants';

const enc = (s: string) => new TextEncoder().encode(s);

describe('RawNewlineCounter', () => {
  const counter = new RawNewlineCounter();

  it('has stable id', () => {
    expect(counter.id).toBe(LINE_COUNTER_RAW_NEWLINE);
  });

  it('returns 0 for an empty file', () => {
    expect(counter.count(new Uint8Array())).toBe(0);
  });

  it('returns 1 for "a" with no trailing newline', () => {
    expect(counter.count(enc('a'))).toBe(1);
  });

  it('returns 1 for "a\\n"', () => {
    expect(counter.count(enc('a\n'))).toBe(1);
  });

  it('returns 3 for "a\\nb\\nc"', () => {
    expect(counter.count(enc('a\nb\nc'))).toBe(3);
  });

  it('returns 3 for "a\\nb\\nc\\n"', () => {
    expect(counter.count(enc('a\nb\nc\n'))).toBe(3);
  });

  it('counts only newlines for "\\n\\n\\n" (three empty lines)', () => {
    expect(counter.count(enc('\n\n\n'))).toBe(3);
  });

  it('treats CRLF as one line each (\\n counted, \\r ignored)', () => {
    expect(counter.count(enc('a\r\nb\r\n'))).toBe(2);
  });

  it('handles a large buffer efficiently', () => {
    const big = enc('x\n'.repeat(100000));
    expect(counter.count(big)).toBe(100000);
  });
});
