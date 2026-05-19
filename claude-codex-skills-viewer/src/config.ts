import * as vscode from 'vscode';
import type { ToolFilter, CanonicalSource } from './types';

export type InstructionFormat = 'ref' | 'compact' | 'full' | 'legacy';

export interface CcSkillsConfig {
  includeWorkspace: boolean;
  includeGlobal: boolean;
  includeExtensions: boolean;
  tools: ToolFilter;
  extraGlobalRoots: string[];
  extraWorkspaceRoots: string[];
  instructionFormat: InstructionFormat;
  githubToken: string;
  canonicalSources: CanonicalSource[];
  autoSyncCanonicalOnStartup: boolean;
}

// Single source of truth for config defaults — must match package.json
// contributes.configuration. Bumping defaults: edit both files.
export function readConfig(): CcSkillsConfig {
  const c = vscode.workspace.getConfiguration('claudeCodexSkills');
  return {
    includeWorkspace: c.get<boolean>('includeWorkspace', true),
    includeGlobal: c.get<boolean>('includeGlobal', true),
    includeExtensions: c.get<boolean>('includeExtensions', true),
    tools: c.get<ToolFilter>('tools', 'all'),
    extraGlobalRoots: c.get<string[]>('extraGlobalRoots', []),
    extraWorkspaceRoots: c.get<string[]>('extraWorkspaceRoots', []),
    instructionFormat: c.get<InstructionFormat>('instructionFormat', 'ref'),
    githubToken: c.get<string>('githubToken', '') || process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '',
    canonicalSources: c.get<CanonicalSource[]>('canonicalSources', []),
    autoSyncCanonicalOnStartup: c.get<boolean>('autoSyncCanonicalOnStartup', false)
  };
}
