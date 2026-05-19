import type { Tab, Segment, InstructionFile } from '../types';

export const TABS: Tab[] = [
  { id: 'skill', label: 'SKILL.md', desc: 'Skills' },
  { id: 'rootmd', label: 'Root MD', desc: 'CLAUDE.md / .cursorrules / etc.' },
  { id: 'agent', label: 'AGENTS.md', desc: 'Agent manifests' },
  { id: 'memory', label: 'Memory', desc: 'Per-project memory entries' },
  { id: 'browse', label: 'Browse', desc: 'Remote catalog' }
];

export const SCOPES: Segment[] = [
  { id: 'all', label: 'All' },
  { id: 'global', label: 'Global' },
  { id: 'workspace', label: 'Workspace' },
  { id: 'this', label: 'This Folder' }
];

export const TOOLS: Segment[] = [
  { id: 'all', label: 'All' },
  { id: 'claude', label: 'Claude' },
  { id: 'codex', label: 'Codex' },
  { id: 'copilot', label: 'Copilot' },
  { id: 'cursor', label: 'Cursor' },
  { id: 'gemini', label: 'Gemini' },
  { id: 'windsurf', label: 'Windsurf' },
  { id: 'cline', label: 'Cline' },
  { id: 'agents', label: 'Agents' }
];

export const TOOL_FILE_MATCHERS: Record<string, (f: InstructionFile) => boolean> = {
  claude: f => /CLAUDE\.md|\.claude/i.test(f.abs),
  codex: f => /AGENTS\.md|\.codex/i.test(f.abs),
  copilot: f => /copilot|\.copilot/i.test(f.abs),
  cursor: f => /\.cursor/i.test(f.abs),
  gemini: f => /GEMINI\.md|\.gemini/i.test(f.abs),
  windsurf: f => /\.windsurf/i.test(f.abs),
  cline: f => /\.cline/i.test(f.abs),
  agents: f => /AGENTS\.md/i.test(f.abs)
};
