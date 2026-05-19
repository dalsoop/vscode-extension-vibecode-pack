import assert from 'node:assert/strict';
import * as path from 'node:path';
import { describe, it } from 'mocha';
import { parseFrontmatter, extractWhenToUse, describeSkill, findSkillMd } from '../../src/parser';

const FIXTURE = path.join(__dirname, '..', 'fixtures', 'sample-skill');

describe('parser', () => {
  describe('parseFrontmatter', () => {
    it('extracts YAML keys', () => {
      const { meta } = parseFrontmatter(path.join(FIXTURE, 'SKILL.md'));
      assert.equal(meta?.name, 'sample-skill');
      assert.match(meta?.description, /sample skill/);
    });

    it('parses array values', () => {
      const { meta } = parseFrontmatter(path.join(FIXTURE, 'SKILL.md'));
      assert.deepEqual(meta?.categories, ['test', 'sample']);
    });
  });

  describe('extractWhenToUse', () => {
    it('matches English heading', () => {
      const body = '## When to use\n\nThis is when.\n\n## Other';
      assert.equal(extractWhenToUse(body), 'This is when.');
    });

    it('matches Korean heading', () => {
      const body = '## 언제 쓰는가\n\n이때 쓴다.\n\n## 그 외';
      assert.equal(extractWhenToUse(body), '이때 쓴다.');
    });

    it('returns null when missing', () => {
      assert.equal(extractWhenToUse('# heading\nbody'), null);
    });
  });

  describe('findSkillMd', () => {
    it('prefers SKILL.md', () => {
      const found = findSkillMd(FIXTURE);
      assert.ok(found?.endsWith('SKILL.md'));
    });
  });

  describe('describeSkill', () => {
    it('returns full info for valid skill folder', () => {
      const info = describeSkill(FIXTURE);
      assert.equal(info.name, 'sample-skill');
      assert.equal(info.categories.length, 2);
      assert.ok(info.whenToUse);
      assert.ok(info.body?.includes('echo hello'));
    });
  });
});
