import type { Tab, Segment } from '../types';

export const TABS: Tab[] = [
  { id: 'skill', label: 'SKILL.md', desc: 'Skills' },
  { id: 'rootmd', label: 'Root MD', desc: 'CLAUDE.md / .cursorrules / etc.' },
  { id: 'agent', label: 'AGENTS.md', desc: 'Agent manifests' },
  { id: 'memory', label: 'Memory', desc: 'Per-project memory entries' }
];

export const SCOPES: Segment[] = [
  { id: 'all', label: 'All' },
  { id: 'global', label: 'Global' },
  { id: 'workspace', label: 'Workspace' },
  { id: 'this', label: 'This Folder' }
];
