import assert from 'node:assert/strict';
import { describe, it } from 'mocha';
import { slugify, formatBytes, formatAge, memoryKind } from '../../src/memory';

describe('memory', () => {
  describe('slugify', () => {
    it('replaces non-alphanumeric with hyphens', () => {
      assert.equal(slugify('/Users/jeonghan/Documents/WORK/PROJECT/강의 PPT'),
                   '-Users-jeonghan-Documents-WORK-PROJECT----PPT');
    });

    it('handles plain ASCII', () => {
      assert.equal(slugify('/a/b/c'), '-a-b-c');
    });
  });

  describe('formatBytes', () => {
    it('formats <1KB as B', () => {
      assert.equal(formatBytes(512), '512B');
    });
    it('formats KB', () => {
      assert.equal(formatBytes(2048), '2.0KB');
    });
    it('formats MB', () => {
      assert.equal(formatBytes(5 * 1024 * 1024), '5.0MB');
    });
  });

  describe('formatAge', () => {
    it('returns empty for 0', () => {
      assert.equal(formatAge(0), '');
    });
    it('formats seconds ago', () => {
      assert.match(formatAge(Date.now() - 5_000), /\d+s ago/);
    });
    it('formats days ago', () => {
      assert.match(formatAge(Date.now() - 86400_000 * 3), /3d ago/);
    });
  });

  describe('memoryKind', () => {
    it('classifies by filename prefix', () => {
      assert.equal(memoryKind('feedback_foo.md', {}), 'feedback');
      assert.equal(memoryKind('project_x.md', {}), 'project');
      assert.equal(memoryKind('user_role.md', {}), 'user');
      assert.equal(memoryKind('reference_api.md', {}), 'reference');
    });
    it('treats MEMORY.md as index', () => {
      assert.equal(memoryKind('MEMORY.md', {}), 'index');
    });
    it('respects explicit type from meta', () => {
      assert.equal(memoryKind('custom.md', { type: 'feedback' }), 'feedback');
    });
  });
});
