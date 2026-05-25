import * as vscode from 'vscode';
import type { ToolDef, MirrorGroup } from './types';
import type { LocaleSetting } from './i18n';

export type InstructionFormat = 'ref' | 'compact' | 'full' | 'legacy';

// Built-in tool defaults. User-edited config is stored as ToolDef[]; if it's
// empty / missing / invalid we seed from this list so a fresh install Just Works.
export const DEFAULT_TOOLS: ToolDef[] = [
  { id: 'claude', label: 'Claude', enabled: true, builtin: true },
  { id: 'codex', label: 'Codex', enabled: true, builtin: true },
  { id: 'copilot', label: 'Copilot', enabled: true, builtin: true },
  { id: 'cursor', label: 'Cursor', enabled: true, builtin: true },
  { id: 'gemini', label: 'Gemini', enabled: true, builtin: true },
  { id: 'windsurf', label: 'Windsurf', enabled: true, builtin: true },
  { id: 'cline', label: 'Cline', enabled: true, builtin: true },
  { id: 'agents', label: 'Agents', enabled: true, builtin: true }
];

export interface CcSkillsConfig {
  language: LocaleSetting;
  includeWorkspace: boolean;
  includeGlobal: boolean;
  includeExtensions: boolean;
  tools: ToolDef[];
  showToolChips: boolean;
  extraGlobalRoots: string[];
  extraWorkspaceRoots: string[];
  instructionFormat: InstructionFormat;
  showScoreBreakdown: boolean;
  mirrorGroups: MirrorGroup[];
  mirrorSkillsByName: boolean;
  mirrorSkillsByNameAlways: boolean;
}

// Normalise whatever shape the user has in their settings. The schema may have
// been the old string ('all'/'claude'/…) or absent — in those cases we fall
// back to DEFAULT_TOOLS so the sidebar isn't empty.
function readTools(c: vscode.WorkspaceConfiguration): ToolDef[] {
  const raw = c.get<unknown>('tools');
  if (!Array.isArray(raw) || !raw.length) return DEFAULT_TOOLS.map(d => ({ ...d }));
  const out: ToolDef[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const def = item as Partial<ToolDef>;
    const id = typeof def.id === 'string' ? def.id.trim() : '';
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      label: typeof def.label === 'string' && def.label.trim() ? def.label : id,
      enabled: def.enabled !== false,
      builtin: !!def.builtin
    });
  }
  return out.length ? out : DEFAULT_TOOLS.map(d => ({ ...d }));
}

export function readConfig(): CcSkillsConfig {
  const c = vscode.workspace.getConfiguration('vibecodeSkills');
  return {
    language: c.get<LocaleSetting>('language', 'auto'),
    includeWorkspace: c.get<boolean>('includeWorkspace', true),
    includeGlobal: c.get<boolean>('includeGlobal', true),
    includeExtensions: c.get<boolean>('includeExtensions', true),
    tools: readTools(c),
    showToolChips: c.get<boolean>('showToolChips', true),
    extraGlobalRoots: c.get<string[]>('extraGlobalRoots', []),
    extraWorkspaceRoots: c.get<string[]>('extraWorkspaceRoots', []),
    instructionFormat: c.get<InstructionFormat>('instructionFormat', 'ref'),
    showScoreBreakdown: c.get<boolean>('showScoreBreakdown', true),
    mirrorGroups: c.get<MirrorGroup[]>('mirrorGroups', []),
    mirrorSkillsByName: c.get<boolean>('mirrorSkillsByName', false),
    mirrorSkillsByNameAlways: c.get<boolean>('mirrorSkillsByNameAlways', false)
  };
}

// Convenience: the set of tool ids that should currently be shown.
export function enabledToolIds(cfg: CcSkillsConfig): Set<string> {
  return new Set(cfg.tools.filter(t => t.enabled).map(t => t.id));
}
