import { SkillScorer } from './skill';
import { FileScorer } from './file';
import type { Skill } from '../types';

const skillScorer = new SkillScorer();
const fileScorer = new FileScorer();

export const score = skillScorer.score.bind(skillScorer);
export const fileScore = fileScorer.score.bind(fileScorer);

export function buildDupMap(items: Skill[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const it of items) m.set(it.name, (m.get(it.name) || 0) + 1);
  return m;
}

export { SkillScorer, FileScorer };
export * from './rules';
