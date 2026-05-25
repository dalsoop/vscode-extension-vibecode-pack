import assert from 'node:assert/strict';
import { describe, it } from 'mocha';
import { parseSections, replaceSection, sectionBody } from '../../src/preview/sections';

const SAMPLE = `---
name: test-skill
description: A test skill
---

# test-skill

intro line

## When to use

This is when.

## Examples

\`\`\`bash
echo hi
\`\`\`

## Notes

Some notes here.
`;

describe('sections', () => {
  it('extracts frontmatter section', () => {
    const sections = parseSections(SAMPLE);
    const fm = sections.find(s => s.id === 'frontmatter');
    assert.ok(fm);
    assert.equal(fm!.kind, 'frontmatter');
    assert.match(fm!.raw, /name: test-skill/);
  });

  it('extracts title section with body', () => {
    const sections = parseSections(SAMPLE);
    const title = sections.find(s => s.id === 'title');
    assert.ok(title);
    assert.equal(title!.heading, 'test-skill');
    assert.match(title!.raw, /intro line/);
  });

  it('canonicalizes When to use', () => {
    const sections = parseSections(SAMPLE);
    const wtu = sections.find(s => s.id === 'when-to-use');
    assert.ok(wtu);
    assert.equal(wtu!.canonical, 'when-to-use');
  });

  it('canonicalizes Examples (English)', () => {
    const sections = parseSections(SAMPLE);
    assert.ok(sections.find(s => s.id === 'examples'));
  });

  it('canonicalizes Korean headings', () => {
    const ko = `# t\n\n## 언제 쓰는가\n\n내용\n\n## 예제\n\n내용2\n`;
    const sections = parseSections(ko);
    assert.ok(sections.find(s => s.canonical === 'when-to-use'));
    assert.ok(sections.find(s => s.canonical === 'examples'));
  });

  it('uses h2:<slug> for unknown headings', () => {
    const sections = parseSections(SAMPLE);
    const notes = sections.find(s => s.id === 'notes');
    assert.ok(notes); // 'Notes' is canonical
    // a non-canonical custom heading:
    const custom = parseSections(`# t\n\n## My Custom\n\nbody\n`);
    assert.ok(custom.find(s => s.id === 'h2:my-custom'));
  });

  describe('sectionBody', () => {
    it('strips heading from H2', () => {
      const sections = parseSections(SAMPLE);
      const wtu = sections.find(s => s.id === 'when-to-use')!;
      assert.equal(sectionBody(wtu).trim(), 'This is when.');
    });

    it('strips fences from frontmatter', () => {
      const sections = parseSections(SAMPLE);
      const fm = sections.find(s => s.id === 'frontmatter')!;
      const body = sectionBody(fm);
      assert.match(body, /name: test-skill/);
      assert.doesNotMatch(body, /^---/);
    });
  });

  describe('replaceSection', () => {
    it('replaces target section preserving others', () => {
      const newWtu = '## When to use\n\nNew trigger.\n';
      const next = replaceSection(SAMPLE, 'when-to-use', newWtu);
      assert.match(next, /New trigger/);
      assert.doesNotMatch(next, /This is when/);
      assert.match(next, /Some notes here/); // other section intact
      assert.match(next, /## Examples/);
    });

    it('throws on unknown section', () => {
      assert.throws(() => replaceSection(SAMPLE, 'no-such-section', 'foo'), /not found/);
    });
  });
});
