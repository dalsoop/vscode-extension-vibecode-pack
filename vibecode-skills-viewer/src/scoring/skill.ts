import * as fs from 'fs';
import { parseFrontmatter, extractWhenToUse, findSkillMd } from '../parser';
import * as R from './rules';
import { RuleBasedScorer, type ScoreRule } from './rule';
import type { Scorer, ScoreContext, ScoreResult, Skill } from '../types';

// Cached file inspection per item so rules don't re-read.
interface SkillItem {
  name: string;
  dir: string;
  mdPath?: string | null;
}
interface Inspected {
  mdPath: string | null;
  raw: string;
  body: string;
  meta: Record<string, any>;
  desc: string;
  whenToUse: string | null;
  lines: number;
  chars: number;
  mtime: number;
  ageDays: number;
  h1Count: number;
  codeBlocks: number;
}

const cache = new WeakMap<object, Inspected | null>();

function inspect(item: SkillItem): Inspected | null {
  const key = item as unknown as object;
  if (cache.has(key)) return cache.get(key)!;
  const mdPath = item.mdPath || findSkillMd(item.dir);
  if (!mdPath) {
    cache.set(key, null);
    return null;
  }
  const raw = fs.readFileSync(mdPath, 'utf8');
  const st = fs.statSync(mdPath);
  const { meta = {}, body = '' } = parseFrontmatter(mdPath);
  const inspected: Inspected = {
    mdPath,
    raw,
    body,
    meta,
    desc: meta.description || '',
    whenToUse: extractWhenToUse(body),
    lines: R.countLines(raw),
    chars: raw.length,
    mtime: st.mtimeMs,
    ageDays: (Date.now() - st.mtimeMs) / (1000 * 60 * 60 * 24),
    h1Count: (body.match(/^#\s/gm) || []).length,
    codeBlocks: (body.match(/```/g) || []).length / 2
  };
  cache.set(key, inspected);
  return inspected;
}

// ── Rules (Anthropic 4-axis rubric) ────────────────────────────────────
const SKILL_RULES: ScoreRule<SkillItem>[] = [
  // Clarity
  {
    id: 'has-desc',
    axis: 'clarity',
    weight: 5,
    check: it => {
      const i = inspect(it);
      return { pass: !!i?.desc, reason: 'Missing description' };
    }
  },
  {
    id: 'desc-length',
    axis: 'clarity',
    weight: 5,
    check: it => {
      const i = inspect(it);
      if (!i?.desc) return { pass: false };
      return { pass: i.desc.length <= 200, reason: `Description too long (${i.desc.length} chars > 200)` };
    }
  },
  {
    id: 'no-emoji-desc',
    axis: 'clarity',
    weight: 5,
    check: it => {
      const i = inspect(it);
      if (!i?.desc) return { pass: false };
      return { pass: !R.hasEmoji(i.desc), reason: 'Emoji in description' };
    }
  },
  {
    id: 'when-to-use',
    axis: 'clarity',
    weight: 5,
    check: it => {
      const i = inspect(it);
      return { pass: !!i?.whenToUse, reason: 'Missing "When to use" section' };
    }
  },
  {
    id: 'heading-hierarchy',
    axis: 'clarity',
    weight: 5,
    check: it => {
      const i = inspect(it);
      return { pass: !!i && R.validHeadings(i.body), reason: 'Heading hierarchy skips a level (MD001)' };
    }
  },

  // Completeness
  {
    id: 'meta-name',
    axis: 'completeness',
    weight: 5,
    check: it => {
      const i = inspect(it);
      return { pass: !!i?.meta.name, reason: 'Missing frontmatter `name`' };
    }
  },
  {
    id: 'uses-SKILL-md',
    axis: 'completeness',
    weight: 5,
    check: it => {
      const i = inspect(it);
      return { pass: !!i?.mdPath?.endsWith('SKILL.md'), reason: 'Uses README.md / other instead of SKILL.md' };
    }
  },
  {
    id: 'has-code-or-ex',
    axis: 'completeness',
    weight: 5,
    check: it => {
      const i = inspect(it);
      if (!i) return { pass: false };
      return {
        pass: R.hasCodeBlock(i.body) || R.hasExamplesSection(i.body),
        reason: 'No code block or Examples section'
      };
    }
  },
  {
    id: 'trigger-hints',
    axis: 'completeness',
    weight: 5,
    check: it => {
      const i = inspect(it);
      if (!i) return { pass: false };
      return { pass: R.hasTriggerHints(i.body, i.desc), reason: 'No trigger phrases / use cases listed' };
    }
  },
  {
    id: 'body-length',
    axis: 'completeness',
    weight: 5,
    check: it => {
      const i = inspect(it);
      if (!i) return { pass: false };
      return { pass: i.body.length >= 200, reason: `Body too short (${i.body.length} chars < 200)` };
    }
  },

  // Examples
  {
    id: 'has-code-blocks',
    axis: 'examples',
    weight: 10,
    check: it => {
      const i = inspect(it);
      return { pass: (i?.codeBlocks ?? 0) >= 1, reason: 'No code blocks' };
    }
  },
  {
    id: 'examples-section',
    axis: 'examples',
    weight: 10,
    check: it => {
      const i = inspect(it);
      return { pass: !!i && R.hasExamplesSection(i.body), reason: 'No "Examples" / "사용법" section' };
    }
  },
  {
    id: 'reasonable-code',
    axis: 'examples',
    weight: 5,
    check: it => {
      const i = inspect(it);
      const n = i?.codeBlocks ?? 0;
      return { pass: n <= 8, reason: `Too many code blocks (${n})` };
    }
  },

  // Focus
  {
    id: 'under-500-lines',
    axis: 'focus',
    weight: 8,
    check: it => {
      const i = inspect(it);
      return { pass: (i?.lines ?? 0) <= 500, reason: `Over 500 lines (${i?.lines})` };
    }
  },
  {
    id: 'unique-name',
    axis: 'focus',
    weight: 7,
    check: (it, ctx) => {
      const dup = !!ctx?.dupMap && (ctx.dupMap.get(it.name) || 0) > 1;
      return { pass: !dup, reason: 'Duplicate folder name across sources' };
    }
  },
  {
    id: 'recent',
    axis: 'focus',
    weight: 5,
    check: it => {
      const i = inspect(it);
      const d = i?.ageDays ?? 0;
      return { pass: d <= 180, reason: `Stale (${Math.floor(d)}d since modified)` };
    }
  },
  {
    id: 'single-h1',
    axis: 'focus',
    weight: 3,
    check: it => {
      const i = inspect(it);
      return { pass: (i?.h1Count ?? 0) <= 1, reason: `Multiple H1 headings (${i?.h1Count})` };
    }
  },
  {
    id: 'no-emoji-body',
    axis: 'focus',
    weight: 2,
    check: it => {
      const i = inspect(it);
      return { pass: !!i && !R.hasEmoji(i.body.slice(0, 2000)), reason: 'Emoji in body' };
    }
  }
];

const skillMeta = (it: SkillItem) => {
  const i = inspect(it);
  return { lines: i?.lines ?? 0, chars: i?.chars ?? 0, mtime: i?.mtime ?? 0 };
};

const baseScorer = new RuleBasedScorer<SkillItem>(SKILL_RULES, 'axis', skillMeta);

// Public class that handles the "no SKILL.md" special case.
export class SkillScorer implements Scorer<SkillItem> {
  score(item: SkillItem, ctx?: ScoreContext): ScoreResult {
    const i = inspect(item);
    if (!i) {
      return {
        total: 0,
        pct: 0,
        grade: 'F',
        color: 'red',
        lines: 0,
        chars: 0,
        mtime: 0,
        axes: { clarity: 0, completeness: 0, examples: 0, focus: 0 },
        issues: ['No SKILL.md / README.md found']
      };
    }
    return baseScorer.score(item, ctx);
  }
}

export { SKILL_RULES };
