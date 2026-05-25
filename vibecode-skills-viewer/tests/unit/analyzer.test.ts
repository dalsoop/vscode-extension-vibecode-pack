import assert from 'node:assert/strict';
import * as path from 'node:path';
import { describe, it } from 'mocha';
import { SkillScorer } from '../../src/scoring/skill';
import { FileScorer } from '../../src/scoring/file';
import { hasEmoji, countLines } from '../../src/scoring/rules';

const FIXTURE = path.join(__dirname, '..', 'fixtures', 'sample-skill');

describe('scoring/rules', () => {
  it('hasEmoji detects emoji', () => {
    assert.equal(hasEmoji('hello 👋'), true);
    assert.equal(hasEmoji('plain text'), false);
    assert.equal(hasEmoji(null), false);
  });

  it('countLines counts newlines + 1', () => {
    assert.equal(countLines('a\nb\nc'), 3);
    assert.equal(countLines(''), 0);
  });
});

describe('SkillScorer', () => {
  const scorer = new SkillScorer();

  it('scores sample skill', () => {
    const result = scorer.score({ name: 'sample-skill', dir: FIXTURE });
    assert.ok(result.pct > 50, `expected >50, got ${result.pct}`);
    assert.ok(result.axes);
    assert.ok(result.axes.clarity > 0);
    assert.ok(result.axes.examples > 0);
  });

  it('returns F when no SKILL.md', () => {
    const result = scorer.score({ name: 'nope', dir: '/tmp/__nonexistent__' });
    assert.equal(result.grade, 'F');
    assert.equal(result.pct, 0);
  });

  it('flags duplicate names', () => {
    const dup = new Map([['sample-skill', 2]]);
    const result = scorer.score({ name: 'sample-skill', dir: FIXTURE }, { dupMap: dup });
    assert.ok(result.issues.some(s => /Duplicate/.test(s)));
  });
});

describe('FileScorer', () => {
  const scorer = new FileScorer();

  it('returns dash grade for missing', () => {
    const result = scorer.score('/tmp/__nonexistent__');
    assert.equal(result.grade, '-');
  });

  it('scores real fixture', () => {
    const result = scorer.score(path.join(FIXTURE, 'SKILL.md'));
    assert.ok(result.pct > 0);
    assert.ok(result.lines > 0);
  });
});
