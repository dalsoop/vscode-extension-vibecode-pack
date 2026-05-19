import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { describe, it, before, after } from 'mocha';
import { snapshot, listVersions, restore, readVersion, _resetRoot, ROOT } from '../../src/preview/versions';

const TMP = path.join(os.tmpdir(), `ccskills-versions-${Date.now()}`);
const FILE = path.join(TMP, 'SKILL.md');

describe('versions', () => {
  before(() => {
    _resetRoot();
    fs.mkdirSync(TMP, { recursive: true });
    fs.writeFileSync(FILE, 'version 1\n', 'utf8');
  });

  after(() => {
    fs.rmSync(TMP, { recursive: true, force: true });
    if (fs.existsSync(ROOT)) fs.rmSync(ROOT, { recursive: true, force: true });
  });

  it('returns empty initially', () => {
    assert.equal(listVersions(FILE).length, 0);
  });

  it('snapshot creates entry', () => {
    const v = snapshot(FILE, { tag: 'edit', sectionId: 'title' });
    assert.ok(v);
    assert.equal(v!.tag, 'edit');
    assert.equal(v!.sectionId, 'title');
    const all = listVersions(FILE);
    assert.equal(all.length, 1);
  });

  it('multiple snapshots accumulate', () => {
    fs.writeFileSync(FILE, 'version 2\n', 'utf8');
    snapshot(FILE, { tag: 'edit', sectionId: 'examples' });
    fs.writeFileSync(FILE, 'version 3\n', 'utf8');
    snapshot(FILE, { tag: 'auto' });
    assert.ok(listVersions(FILE).length >= 3);
  });

  it('listed versions sorted newest-first', () => {
    const vs = listVersions(FILE);
    for (let i = 1; i < vs.length; i++) {
      assert.ok(vs[i - 1].mtime >= vs[i].mtime);
    }
  });

  it('readVersion returns snapshot contents', () => {
    const vs = listVersions(FILE);
    const oldest = vs[vs.length - 1];
    const content = readVersion(oldest);
    assert.ok(typeof content === 'string');
    assert.match(content, /version/);
  });

  it('restore overwrites current and adds a restore marker', () => {
    fs.writeFileSync(FILE, 'current latest\n', 'utf8');
    const vs = listVersions(FILE);
    const target = vs[vs.length - 1]; // oldest
    const beforeContent = readVersion(target);
    restore(FILE, target);
    assert.equal(fs.readFileSync(FILE, 'utf8'), beforeContent);
    const afterVs = listVersions(FILE);
    assert.ok(afterVs.some(v => v.tag === 'restore'));
  });
});
