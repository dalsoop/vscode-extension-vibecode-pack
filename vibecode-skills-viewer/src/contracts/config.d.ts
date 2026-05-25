declare namespace Contracts {
  // User-configurable tool entry. Built-ins seed the default; users can add
  // custom entries or disable/remove any of them.
  interface ToolDef {
    id: string;
    label: string;
    enabled: boolean;
    builtin?: boolean;
  }

  // One mirror group — files inside share content (saving any rewrites them all).
  interface MirrorGroup {
    id: string;
    label: string;
    paths: string[];
    alwaysMirror?: boolean;
  }

  // Settings-panel preset descriptor that the controller computes per
  // workspace (which preset paths actually exist on this machine).
  interface PresetInfo {
    id: string;
    label: string;
    description: string;
    scope: 'global' | 'workspace';
    availablePaths: string[];
  }

  // The shape returned by readConfig() and pushed into webview payloads.
  interface CcSkillsConfig {
    language: LocaleSetting;
    includeWorkspace: boolean;
    includeGlobal: boolean;
    includeExtensions: boolean;
    tools: ToolDef[];
    extraGlobalRoots: string[];
    extraWorkspaceRoots: string[];
    instructionFormat: InstructionFormat;
    githubToken: string;
    showScoreBreakdown: boolean;
    mirrorGroups: MirrorGroup[];
    mirrorSkillsByName: boolean;
    mirrorSkillsByNameAlways: boolean;
  }
}
