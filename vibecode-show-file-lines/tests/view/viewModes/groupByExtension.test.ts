import { describe, it, expect } from 'vitest';
import { GroupByExtension } from '../../../src/view/viewModes/groupByExtension';
import { VIEW_MODE_GROUP_EXT } from '../../../src/constants';
import type { FileStat, Uri, GroupNode } from '../../../src/core/types';

const uri = (p: string): Uri => ({ fsPath: p, toString: () => `file://${p}` });
const stat = (p: string, lines: number, ext: string): FileStat =>
  ({ uri: uri(p), ext, lines, size: 100, mtime: 1 });

describe('GroupByExtension', () => {
  const mode = new GroupByExtension();

  it('id matches constant', () => {
    expect(mode.id).toBe(VIEW_MODE_GROUP_EXT);
  });

  it('groups files by extension and computes counts/totals', () => {
    const nodes = mode.build([
      stat('/a.ts', 10, '.ts'), stat('/b.ts', 20, '.ts'),
      stat('/c.md', 5, '.md')
    ], { topN: 100, warnThreshold: 500 });
    expect(nodes).toHaveLength(2);
    const tsGroup = nodes.find(n => n.kind === 'group' && n.label === '.ts') as GroupNode;
    expect(tsGroup.fileCount).toBe(2);
    expect(tsGroup.totalLines).toBe(30);
    expect(tsGroup.children.map(c => c.stat.lines)).toEqual([20, 10]);
  });

  it('sorts groups by total lines descending', () => {
    const nodes = mode.build([
      stat('/a.md', 1, '.md'),
      stat('/b.ts', 100, '.ts'),
      stat('/c.json', 50, '.json')
    ], { topN: 100, warnThreshold: 500 });
    expect(nodes.map(n => n.kind === 'group' ? n.label : '')).toEqual(['.ts', '.json', '.md']);
  });

  it('uses "(no extension)" label for empty ext', () => {
    const nodes = mode.build([stat('/Makefile', 7, '')], { topN: 100, warnThreshold: 500 });
    expect(nodes[0].kind === 'group' && nodes[0].label).toBe('(no extension)');
  });

  it('does not apply topN inside groups (topN is a flat-mode concept)', () => {
    const many: FileStat[] = [];
    for (let i = 0; i < 5; i++) many.push(stat(`/f${i}.ts`, i + 1, '.ts'));
    const nodes = mode.build(many, { topN: 2, warnThreshold: 500 });
    const ts = nodes[0] as GroupNode;
    expect(ts.children).toHaveLength(5);
  });

  it('marks warn correctly inside groups', () => {
    const nodes = mode.build([stat('/a.ts', 500, '.ts'), stat('/b.ts', 1, '.ts')], { topN: 100, warnThreshold: 500 });
    const g = nodes[0] as GroupNode;
    expect(g.children[0].warn).toBe(true);
    expect(g.children[1].warn).toBe(false);
  });
});
