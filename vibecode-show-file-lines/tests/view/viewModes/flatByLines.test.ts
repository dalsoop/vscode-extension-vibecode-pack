import { describe, it, expect } from 'vitest';
import { FlatByLines } from '../../../src/view/viewModes/flatByLines';
import { VIEW_MODE_FLAT } from '../../../src/constants';
import type { FileStat, Uri } from '../../../src/core/types';

const uri = (p: string): Uri => ({ fsPath: p, toString: () => `file://${p}` });
const stat = (p: string, lines: number, ext = '.ts'): FileStat =>
  ({ uri: uri(p), ext, lines, size: 100, mtime: 1 });

describe('FlatByLines', () => {
  const mode = new FlatByLines();

  it('id matches constant', () => {
    expect(mode.id).toBe(VIEW_MODE_FLAT);
  });

  it('sorts files descending by lines', () => {
    const nodes = mode.build(
      [stat('/a', 10), stat('/b', 100), stat('/c', 50)],
      { topN: 10, warnThreshold: 500 }
    );
    expect(nodes).toHaveLength(3);
    expect(nodes.map(n => (n.kind === 'file' ? n.stat.uri.fsPath : '')))
      .toEqual(['/b', '/c', '/a']);
  });

  it('truncates to topN', () => {
    const stats = [stat('/a', 1), stat('/b', 2), stat('/c', 3), stat('/d', 4)];
    const nodes = mode.build(stats, { topN: 2, warnThreshold: 500 });
    expect(nodes).toHaveLength(2);
    expect(nodes[0].kind === 'file' && nodes[0].stat.lines).toBe(4);
    expect(nodes[1].kind === 'file' && nodes[1].stat.lines).toBe(3);
  });

  it('marks files at/above warnThreshold with warn=true', () => {
    const nodes = mode.build([stat('/a', 500), stat('/b', 499)], { topN: 10, warnThreshold: 500 });
    expect(nodes[0].kind === 'file' && nodes[0].warn).toBe(true);
    expect(nodes[1].kind === 'file' && nodes[1].warn).toBe(false);
  });

  it('returns empty array for empty input', () => {
    expect(mode.build([], { topN: 10, warnThreshold: 500 })).toEqual([]);
  });
});
