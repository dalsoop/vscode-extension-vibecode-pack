import assert from 'node:assert/strict';
import { describe, it } from 'mocha';
import { validate } from '../../src/catalog';

describe('catalog.validate', () => {
  const valid = {
    version: '0.1.0',
    sources: [
      { id: 'x', name: 'X', tier: 'official', repo: 'foo/bar' }
    ],
    categories: ['a', 'b']
  };

  it('accepts a minimal valid catalog', () => {
    const c = validate(valid);
    assert.equal(c.sources.length, 1);
    assert.equal(c.categories.length, 2);
  });

  it('rejects missing version', () => {
    assert.throws(() => validate({ sources: [], categories: [] }), /version/);
  });

  it('rejects bad tier', () => {
    assert.throws(
      () => validate({ ...valid, sources: [{ ...valid.sources[0], tier: 'gold' }] }),
      /tier invalid/
    );
  });

  it('rejects sources missing id', () => {
    assert.throws(
      () => validate({ ...valid, sources: [{ name: 'X', tier: 'official', repo: 'a/b' }] }),
      /id missing/
    );
  });

  it('filters non-string categories', () => {
    const c = validate({ ...valid, categories: ['a', 42, 'b'] });
    assert.deepEqual(c.categories, ['a', 'b']);
  });
});
