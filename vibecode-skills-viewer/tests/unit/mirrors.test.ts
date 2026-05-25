import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, it, beforeEach, afterEach } from 'mocha';
import * as vscode from 'vscode';
import { findMirrors, allMirrorTargets, mirrorWrite, detectDrift, expandPreset, PRESETS } from '../../src/mirrors';

const TMP_ROOT = path.join(os.tmpdir(), `vibeskills-mirror-tests-${process.pid}`);

function file(rel: string, content = ''): string {
  const abs = path.join(TMP_ROOT, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content);
  return abs;
}

function configStub(cfg: Record<string, any>): void {
  (vscode.workspace as any).getConfiguration = () => ({
    get: <T>(key: string, def: T) => (key in cfg ? cfg[key] : def)
  });
}

describe('mirrors', () => {
  beforeEach(() => {
    fs.rmSync(TMP_ROOT, { recursive: true, force: true });
    fs.mkdirSync(TMP_ROOT, { recursive: true });
  });
  afterEach(() => {
    fs.rmSync(TMP_ROOT, { recursive: true, force: true });
  });

  describe('explicit mirrorGroups', () => {
    it('returns peer paths when file is in a group', () => {
      const a = file('a.md', 'A');
      const b = file('b.md', 'B');
      const c = file('c.md', 'C');
      configStub({
        mirrorGroups: [{ id: 'g1', label: 'Trio', paths: [a, b, c] }]
      });
      const infos = findMirrors(a);
      assert.equal(infos.length, 1);
      assert.equal(infos[0].source, 'group');
      assert.equal(infos[0].groupLabel, 'Trio');
      assert.deepEqual(infos[0].targets.sort(), [b, c].sort());
    });

    it('returns nothing for file not in any group', () => {
      const a = file('a.md');
      configStub({ mirrorGroups: [{ id: 'g1', label: 'X', paths: ['/some/other.md'] }] });
      assert.deepEqual(findMirrors(a), []);
    });

    it('omits the self path from targets when group lists it', () => {
      const a = file('a.md');
      const b = file('b.md');
      configStub({ mirrorGroups: [{ id: 'g1', label: 'X', paths: [a, b] }] });
      const infos = findMirrors(a);
      assert.ok(!infos[0].targets.includes(a));
    });
  });

  describe('mirrorWrite', () => {
    it('writes the same content to all targets', () => {
      const src = file('src.md', 'old');
      const t1 = file('t1.md', '');
      const t2 = file('t2.md', '');
      const r = mirrorWrite(src, [t1, t2], 'new content');
      assert.equal(r.written.length, 2);
      assert.equal(r.skipped.length, 0);
      assert.equal(fs.readFileSync(t1, 'utf8'), 'new content');
      assert.equal(fs.readFileSync(t2, 'utf8'), 'new content');
    });

    it('skips a target that resolves to the source', () => {
      const src = file('src.md', 'x');
      const r = mirrorWrite(src, [src, file('other.md', '')], 'X');
      assert.equal(r.written.length, 1);
      assert.equal(r.skipped.length, 1);
      assert.equal(r.skipped[0].reason, 'same as source');
    });

    it('creates missing parent directories', () => {
      const src = file('src.md', '');
      const t = path.join(TMP_ROOT, 'deep/nested/new.md');
      const r = mirrorWrite(src, [t], 'hello');
      assert.equal(r.written.length, 1);
      assert.equal(fs.readFileSync(t, 'utf8'), 'hello');
    });
  });

  describe('allMirrorTargets', () => {
    it('deduplicates across multiple groups', () => {
      const a = file('a.md');
      const b = file('b.md');
      configStub({
        mirrorGroups: [
          { id: 'g1', label: 'one', paths: [a, b] },
          { id: 'g2', label: 'two', paths: [a, b] }
        ]
      });
      const t = allMirrorTargets(a);
      assert.equal(t.length, 1);
    });
  });

  describe('detectDrift', () => {
    it('reports inSync=true when peer has the same content', () => {
      const a = file('a.md', 'identical');
      const b = file('b.md', 'identical');
      configStub({ mirrorGroups: [{ id: 'g1', label: 'pair', paths: [a, b] }] });
      const d = detectDrift(a);
      assert.equal(d.peers.length, 1);
      assert.equal(d.peers[0].path, b);
      assert.equal(d.peers[0].exists, true);
      assert.equal(d.peers[0].inSync, true);
    });
    it('reports inSync=false when content differs', () => {
      const a = file('a.md', 'source');
      const b = file('b.md', 'drifted');
      configStub({ mirrorGroups: [{ id: 'g1', label: 'pair', paths: [a, b] }] });
      const d = detectDrift(a);
      assert.equal(d.peers[0].inSync, false);
    });
    it('reports exists=false when peer file is missing', () => {
      const a = file('a.md', 'x');
      const missing = path.join(TMP_ROOT, 'nope.md');
      configStub({ mirrorGroups: [{ id: 'g1', label: 'g', paths: [a, missing] }] });
      const d = detectDrift(a);
      assert.equal(d.peers[0].exists, false);
      assert.equal(d.peers[0].inSync, false);
    });
  });

  describe('expandPreset', () => {
    it('keeps only paths that exist on disk', () => {
      const real = file('home-fake/CLAUDE.md', '');
      const fakeHome = path.dirname(real);
      const preset = PRESETS.find(p => p.id === 'global-root-md');
      assert.ok(preset);
      // Stub the preset's home arg by calling resolve directly + filtering.
      const candidates = preset!.resolve({ home: fakeHome });
      assert.ok(candidates.includes(real));
      const survived = expandPreset({ ...preset!, resolve: () => candidates }, null);
      assert.deepEqual(survived, [real]); // only the one that exists
    });
    it('workspace preset returns empty when workspace is null', () => {
      const preset = PRESETS.find(p => p.id === 'workspace-root-md');
      assert.ok(preset);
      assert.deepEqual(expandPreset(preset!, null), []);
    });
  });

  describe('alwaysMirror', () => {
    it('propagates alwaysMirror flag from group config into MirrorInfo', () => {
      const a = file('a.md');
      const b = file('b.md');
      configStub({
        mirrorGroups: [{ id: 'g1', label: 'auto', paths: [a, b], alwaysMirror: true }]
      });
      const infos = findMirrors(a);
      assert.equal(infos[0].alwaysMirror, true);
    });
  });
});
