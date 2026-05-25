import * as fs from 'fs';
import * as R from './rules';
import { RuleBasedScorer, type ScoreRule } from './rule';
import type { Scorer, ScoreResult } from '../types';

interface Inspected {
  raw: string;
  lines: number;
  chars: number;
  mtime: number;
  ageDays: number;
}

const cache = new Map<string, Inspected | null>();

function inspect(abs: string): Inspected | null {
  if (cache.has(abs)) return cache.get(abs)!;
  if (!fs.existsSync(abs)) {
    cache.set(abs, null);
    return null;
  }
  const raw = fs.readFileSync(abs, 'utf8');
  const st = fs.statSync(abs);
  const ins: Inspected = {
    raw,
    lines: R.countLines(raw),
    chars: raw.length,
    mtime: st.mtimeMs,
    ageDays: (Date.now() - st.mtimeMs) / (1000 * 60 * 60 * 24)
  };
  cache.set(abs, ins);
  return ins;
}

const FILE_RULES: ScoreRule<string>[] = [
  {
    id: 'no-emoji',
    weight: 20,
    check: abs => {
      const i = inspect(abs);
      return { pass: !i || !R.hasEmoji(i.raw.slice(0, 4000)), reason: 'Emoji used' };
    }
  },
  {
    id: 'under-500',
    weight: 15,
    check: abs => {
      const i = inspect(abs);
      return { pass: !i || i.lines <= 500, reason: `${inspect(abs)?.lines} lines > 500` };
    }
  },
  {
    id: 'not-too-short',
    weight: 10,
    check: abs => {
      const i = inspect(abs);
      return { pass: !i || i.lines >= 5, reason: 'Very short' };
    }
  },
  {
    id: 'fresh',
    weight: 5,
    check: abs => {
      const i = inspect(abs);
      return { pass: !i || i.ageDays <= 180, reason: `Stale (${Math.floor(i?.ageDays ?? 0)}d)` };
    }
  },
  {
    id: 'heading-valid',
    weight: 10,
    check: abs => {
      const i = inspect(abs);
      return { pass: !i || R.validHeadings(i.raw), reason: 'Heading hierarchy invalid' };
    }
  },
  {
    id: 'single-h1',
    weight: 5,
    check: abs => {
      const i = inspect(abs);
      const h = !i ? 0 : (i.raw.match(/^#\s/gm) || []).length;
      return { pass: h <= 1, reason: `Multiple H1 (${h})` };
    }
  }
];

const fileMeta = (abs: string) => {
  const i = inspect(abs);
  return { lines: i?.lines ?? 0, chars: i?.chars ?? 0, mtime: i?.mtime ?? 0 };
};

const baseScorer = new RuleBasedScorer<string>(FILE_RULES, 'deduct', fileMeta);

export class FileScorer implements Scorer<string> {
  score(abs: string): ScoreResult {
    cache.clear(); // file might change between calls
    if (!fs.existsSync(abs)) {
      return {
        lines: 0,
        chars: 0,
        mtime: 0,
        total: 0,
        pct: 0,
        grade: '-',
        color: 'gray',
        issues: ['File does not exist']
      };
    }
    return baseScorer.score(abs);
  }
}

export { FILE_RULES };
