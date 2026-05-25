import * as R from './rules';
import type { Scorer, ScoreResult, ScoreAxes, ScoreContext } from '../types';

export type RuleMode = 'axis' | 'deduct';

export interface RuleResult {
  pass: boolean;
  reason?: string;
}

export interface ScoreRule<T> {
  id: string;
  axis?: keyof ScoreAxes; // required if mode='axis'
  weight: number;
  check(item: T, ctx?: ScoreContext): RuleResult;
}

export interface MetaProvider<T> {
  (item: T, ctx?: ScoreContext): { lines: number; chars: number; mtime: number };
}

export class RuleBasedScorer<T> implements Scorer<T> {
  constructor(
    private readonly rules: ScoreRule<T>[],
    private readonly mode: RuleMode,
    private readonly meta: MetaProvider<T>
  ) {}

  score(item: T, ctx?: ScoreContext): ScoreResult {
    const issues: string[] = [];
    let pct = this.mode === 'deduct' ? 100 : 0;
    const axes: ScoreAxes = { clarity: 0, completeness: 0, examples: 0, focus: 0 };

    for (const rule of this.rules) {
      let result: RuleResult;
      try {
        result = rule.check(item, ctx);
      } catch {
        result = { pass: false, reason: `${rule.id} threw` };
      }

      if (this.mode === 'axis') {
        if (result.pass && rule.axis) axes[rule.axis] += rule.weight;
        else if (!result.pass && result.reason) issues.push(result.reason);
      } else {
        if (!result.pass) {
          pct -= rule.weight;
          if (result.reason) issues.push(result.reason);
        }
      }
    }

    if (this.mode === 'axis') {
      pct = axes.clarity + axes.completeness + axes.examples + axes.focus;
    } else {
      pct = Math.max(0, pct);
    }

    const m = this.meta(item, ctx);
    return {
      total: pct,
      pct,
      grade: R.bucketGrade(pct),
      color: R.bucketColor(pct),
      lines: m.lines,
      chars: m.chars,
      mtime: m.mtime,
      axes: this.mode === 'axis' ? axes : undefined,
      issues
    };
  }
}
