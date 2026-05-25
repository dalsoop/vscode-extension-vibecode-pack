import * as vscode from 'vscode';
import type { ToolFilter, MirrorGroup } from './types';

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
  showScoreBreakdown: boolean;
  mirrorGroups: MirrorGroup[];
  mirrorSkillsByName: boolean;
  mirrorSkillsByNameAlways: boolean;
}

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
    showScoreBreakdown: c.get<boolean>('showScoreBreakdown', true),
    mirrorGroups: c.get<MirrorGroup[]>('mirrorGroups', []),
    mirrorSkillsByName: c.get<boolean>('mirrorSkillsByName', false),
    mirrorSkillsByNameAlways: c.get<boolean>('mirrorSkillsByNameAlways', false)
  };
}
