import * as R from '../scoring/rules';
import { parseFrontmatter } from '../parser';
import { sectionBody, type Section } from './sections';

export interface SectionRuleResult {
  id: string;
  pass: boolean;
  weight: number;
  message: string;
}
export interface SectionScore {
  pct: number;
  earned: number;
  total: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  color: 'green' | 'lime' | 'yellow' | 'orange' | 'red';
  rules: SectionRuleResult[];
  issues: string[]; // failed rule messages
}

// Bucket helpers (reuse rules.ts thresholds)
function bucket(pct: number): { grade: SectionScore['grade']; color: SectionScore['color'] } {
  return { grade: R.bucketGrade(pct), color: R.bucketColor(pct) };
}

function evalRules(rules: Array<{ id: string; weight: number; pass: boolean; message: string }>): SectionScore {
  const total = rules.reduce((a, r) => a + r.weight, 0);
  const earned = rules.reduce((a, r) => a + (r.pass ? r.weight : 0), 0);
  const pct = total > 0 ? Math.round((earned / total) * 100) : 100;
  const { grade, color } = bucket(pct);
  return {
    pct,
    earned,
    total,
    grade,
    color,
    rules: rules.map(r => ({ id: r.id, pass: r.pass, weight: r.weight, message: r.message })),
    issues: rules.filter(r => !r.pass).map(r => r.message)
  };
}

// ── Per-section rule sets ──────────────────────────────────────────────

function scoreFrontmatter(s: Section, fullMdPath?: string): SectionScore {
  // Try to read frontmatter via parser if path available; else parse the raw block ourselves
  let meta: Record<string, any> = {};
  if (fullMdPath) {
    const parsed = parseFrontmatter(fullMdPath);
    meta = parsed.meta || {};
  } else {
    // crude inline parse for tests
    const body = sectionBody(s);
    for (const line of body.split('\n')) {
      const m = line.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
      if (m) meta[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  }
  const desc = String(meta.description || '');
  const cats = Array.isArray(meta.categories)
    ? meta.categories
    : typeof meta.categories === 'string'
      ? meta.categories
          .split(',')
          .map((x: string) => x.trim())
          .filter(Boolean)
      : [];
  return evalRules([
    { id: 'has-name', weight: 5, pass: !!meta.name, message: 'Missing `name`' },
    { id: 'has-desc', weight: 5, pass: !!desc, message: 'Missing `description`' },
    {
      id: 'desc-length',
      weight: 5,
      pass: !desc || desc.length <= 200,
      message: `Description too long (${desc.length} > 200)`
    },
    { id: 'no-emoji-desc', weight: 5, pass: !desc || !R.hasEmoji(desc), message: 'Emoji in description' },
    { id: 'has-categories', weight: 3, pass: cats.length > 0, message: 'No categories listed' }
  ]);
}

function scoreTitle(s: Section): SectionScore {
  const body = sectionBody(s);
  const lineCount = s.endLine - s.startLine;
  return evalRules([
    { id: 'has-h1', weight: 5, pass: !!s.heading, message: 'No H1 title' },
    { id: 'no-emoji-title', weight: 5, pass: !R.hasEmoji(s.heading || ''), message: 'Emoji in title' },
    { id: 'reasonable-len', weight: 5, pass: lineCount <= 6, message: `Title block too long (${lineCount} lines)` },
    { id: 'no-emoji-intro', weight: 3, pass: !R.hasEmoji(body), message: 'Emoji in intro paragraph' }
  ]);
}

function scoreWhenToUse(s: Section): SectionScore {
  const body = sectionBody(s);
  return evalRules([
    { id: 'has-content', weight: 10, pass: body.length >= 20, message: `Content too short (${body.length} < 20)` },
    {
      id: 'trigger-hints',
      weight: 8,
      pass: /[""']|when|trigger|use this|언제|사용하면/i.test(body),
      message: 'No trigger phrases / "..." / use cases'
    },
    { id: 'no-emoji', weight: 5, pass: !R.hasEmoji(body), message: 'Emoji in body' },
    { id: 'under-30-lines', weight: 4, pass: body.split('\n').length <= 30, message: 'Section too long (>30 lines)' }
  ]);
}

function scoreExamples(s: Section): SectionScore {
  const body = sectionBody(s);
  const codeBlocks = (body.match(/```/g) || []).length / 2;
  return evalRules([
    { id: 'has-code', weight: 10, pass: codeBlocks >= 1, message: 'No code blocks' },
    { id: 'reasonable-count', weight: 5, pass: codeBlocks <= 8, message: `Too many code blocks (${codeBlocks})` },
    { id: 'no-empty-blocks', weight: 3, pass: !/```[a-z]*\n```/.test(body), message: 'Empty code block detected' }
  ]);
}

function scoreHeading(s: Section): SectionScore {
  const body = sectionBody(s);
  const lines = body.split('\n');
  return evalRules([
    {
      id: 'has-content',
      weight: 5,
      pass: body.trim().length >= 10,
      message: `Section body too short (${body.length} chars)`
    },
    { id: 'no-emoji', weight: 3, pass: !R.hasEmoji(body), message: 'Emoji in body' },
    { id: 'under-200', weight: 3, pass: lines.length <= 200, message: `Section over 200 lines (${lines.length})` }
  ]);
}

export function scoreSection(section: Section, fullMdPath?: string): SectionScore {
  if (section.canonical === 'frontmatter') return scoreFrontmatter(section, fullMdPath);
  if (section.canonical === 'title') return scoreTitle(section);
  if (section.canonical === 'when-to-use') return scoreWhenToUse(section);
  if (section.canonical === 'examples') return scoreExamples(section);
  return scoreHeading(section);
}
