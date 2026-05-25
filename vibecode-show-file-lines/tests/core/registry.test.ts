import { describe, it, expect } from 'vitest';
import { Registry } from '../../src/core/registry';
import type {
  IBinaryDetector, ILineCountStrategy, ITreeViewMode, FileStat, ViewCtx, TreeNode
} from '../../src/core/types';

const mode = (id: string): ITreeViewMode => ({
  id, labelKey: `lbl.${id}`,
  build: (_s: Iterable<FileStat>, _c: ViewCtx): TreeNode[] => []
});
const counter = (id: string): ILineCountStrategy => ({ id, count: () => 0 });
const detector: IBinaryDetector = { isBinary: () => false };

describe('Registry', () => {
  it('throws when reading binary detector before registration', () => {
    const r = new Registry();
    expect(() => r.getBinaryDetector()).toThrow();
  });

  it('registers and retrieves view modes by id', () => {
    const r = new Registry();
    r.registerViewMode(mode('m1'));
    r.registerViewMode(mode('m2'));
    expect(r.getViewMode('m1')?.id).toBe('m1');
    expect(r.getViewMode('m2')?.id).toBe('m2');
    expect(r.getViewMode('missing')).toBeUndefined();
  });

  it('lists view modes in registration order', () => {
    const r = new Registry();
    r.registerViewMode(mode('a'));
    r.registerViewMode(mode('b'));
    expect(r.listViewModes().map(m => m.id)).toEqual(['a', 'b']);
  });

  it('registers and retrieves line counters by id', () => {
    const r = new Registry();
    r.registerLineCounter(counter('raw'));
    expect(r.getLineCounter('raw')?.id).toBe('raw');
  });

  it('registers and retrieves binary detector', () => {
    const r = new Registry();
    r.registerBinaryDetector(detector);
    expect(r.getBinaryDetector()).toBe(detector);
  });
});
