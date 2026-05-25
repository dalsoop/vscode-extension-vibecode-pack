import { SkillSource } from './skills';
import { RootMdSource, AgentMdSource } from './md';
import { MemorySource } from './memory';
import type { DataSource } from '../types';

export function getDataSources(): DataSource[] {
  return [new SkillSource(), new RootMdSource(), new AgentMdSource(), new MemorySource()];
}

export { TABS, SCOPES } from './constants';
