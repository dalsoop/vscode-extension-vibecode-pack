// Parses a SKILL.md (or any markdown) into named sections.
// Each section has stable ID, line range, and body content.
//
// Stable IDs (canonical names):
//  - 'frontmatter'  → YAML front matter between leading ---
//  - 'title'        → first H1 + body until first H2
//  - 'when-to-use'  → ## When to use | ## 언제 쓰는가 | ## 언제 사용
//  - 'how-to-use'   → ## How to use  | ## 사용법
//  - 'examples'     → ## Examples    | ## 예제 | ## 예시
//  - 'notes'        → ## Notes       | ## 주의
//  - 'h2:<slug>'    → any other H2 section

export type SectionKind = 'frontmatter' | 'title' | 'heading';
export type CanonicalId = 'frontmatter' | 'title' | 'when-to-use' | 'how-to-use' | 'examples' | 'notes';

export interface Section {
  id: string; // 'frontmatter' | 'title' | 'when-to-use' | ... | 'h2:custom-name'
  canonical?: CanonicalId;
  kind: SectionKind;
  level?: number;
  heading?: string; // raw heading text without ##
  startLine: number; // 0-indexed line in original
  endLine: number; // exclusive
  raw: string; // includes heading line if any
}

const CANON: { test: RegExp; id: CanonicalId }[] = [
  { test: /^when to use$/i, id: 'when-to-use' },
  { test: /^언제 (쓰는가|사용)/, id: 'when-to-use' },
  { test: /^how to use$/i, id: 'how-to-use' },
  { test: /^사용법$/, id: 'how-to-use' },
  { test: /^examples?$/i, id: 'examples' },
  { test: /^예제$|^예시$|^사용 예$/, id: 'examples' },
  { test: /^notes?$/i, id: 'notes' },
  { test: /^주의|^주의사항/, id: 'notes' }
];

function slug(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function canonicalize(heading: string): CanonicalId | null {
  const t = heading.trim();
  for (const { test, id } of CANON) if (test.test(t)) return id;
  return null;
}

export function parseSections(raw: string): Section[] {
  const lines = raw.split('\n');
  const sections: Section[] = [];
  let i = 0;

  // ── Frontmatter ──────────────────────────────────────────────────────
  if (lines[0] === '---') {
    let end = -1;
    for (let k = 1; k < lines.length; k++) {
      if (lines[k] === '---') {
        end = k;
        break;
      }
    }
    if (end > 0) {
      sections.push({
        id: 'frontmatter',
        canonical: 'frontmatter',
        kind: 'frontmatter',
        startLine: 0,
        endLine: end + 1,
        raw: lines.slice(0, end + 1).join('\n')
      });
      i = end + 1;
      // skip blank line(s) after frontmatter
      while (i < lines.length && lines[i].trim() === '') i++;
    }
  }

  // ── Title (first H1 block) ──────────────────────────────────────────
  if (i < lines.length && /^#\s/.test(lines[i])) {
    const headingLine = lines[i];
    const start = i;
    i++;
    // body until first H2 or another H1
    while (i < lines.length && !/^#{1,2}\s/.test(lines[i])) i++;
    sections.push({
      id: 'title',
      canonical: 'title',
      kind: 'title',
      level: 1,
      heading: headingLine.replace(/^#\s+/, ''),
      startLine: start,
      endLine: i,
      raw: lines.slice(start, i).join('\n')
    });
  }

  // ── H2 sections (and any further H1 treated as H2) ───────────────────
  while (i < lines.length) {
    const m = lines[i].match(/^(#{1,3})\s+(.+)$/);
    if (!m) {
      i++;
      continue;
    }
    const level = m[1].length;
    const heading = m[2].trim();
    const start = i;
    i++;
    while (i < lines.length && !/^#{1,3}\s/.test(lines[i])) i++;
    const canonical = canonicalize(heading);
    const id = canonical ?? `h${level}:${slug(heading)}`;
    sections.push({
      id,
      canonical: canonical ?? undefined,
      kind: 'heading',
      level,
      heading,
      startLine: start,
      endLine: i,
      raw: lines.slice(start, i).join('\n')
    });
  }

  return sections;
}

// Replaces a section's raw text in the document, preserving everything else.
// Returns the new full document string.
export function replaceSection(raw: string, sectionId: string, newRaw: string): string {
  const sections = parseSections(raw);
  const idx = sections.findIndex(s => s.id === sectionId);
  if (idx < 0) throw new Error(`section ${sectionId} not found`);
  const lines = raw.split('\n');
  const target = sections[idx];
  const replacementLines = newRaw.split('\n');
  const before = lines.slice(0, target.startLine);
  const after = lines.slice(target.endLine);
  // Ensure separation: blank line between sections unless newRaw ends with one
  if (before.length && before[before.length - 1].trim() !== '') before.push('');
  return [...before, ...replacementLines, ...after].join('\n').replace(/\n{3,}/g, '\n\n');
}

// Strips the section (heading + body) from the doc entirely.
// Trailing blank-line runs are collapsed.
export function removeSection(raw: string, sectionId: string): string {
  const sections = parseSections(raw);
  const idx = sections.findIndex(s => s.id === sectionId);
  if (idx < 0) throw new Error(`section ${sectionId} not found`);
  const target = sections[idx];
  const lines = raw.split('\n');
  const before = lines.slice(0, target.startLine);
  const after = lines.slice(target.endLine);
  return [...before, ...after].join('\n').replace(/\n{3,}/g, '\n\n');
}

// Convenience: get a section's body (heading line stripped for H1/H2/H3).
export function sectionBody(s: Section): string {
  if (s.kind === 'frontmatter') {
    return s.raw.replace(/^---\n/, '').replace(/\n---$/, '');
  }
  const lines = s.raw.split('\n');
  if (s.kind === 'title' || s.kind === 'heading') return lines.slice(1).join('\n').trim();
  return s.raw;
}
