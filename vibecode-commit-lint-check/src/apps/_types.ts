import type * as vscode from 'vscode';

export type MenuLocation =
  | 'explorer/context'
  | 'editor/context'
  | 'editor/title'
  | 'editor/title/context';

export interface MenuContribution {
  where: MenuLocation;
  when?: string;
  group?: string;
}

export interface AppManifest {
  /** Stable id used inside the codebase. Becomes the command id namespaced under `vibecodeCommitLint.<id>`. */
  id: string;
  /** Human-readable command title shown in palettes and menus. Default (English) — used in package.nls.json. Per-locale overrides live in `i18n/<locale>.json` keyed by the command id. */
  title: string;
  /** One-line description for README/docs. */
  description: string;
  /** Optional Codicon name (without the `$()` wrapper) shown next to the menu item. */
  icon?: string;
  /** Menus this command should appear in. Empty array = palette only. */
  menus: MenuContribution[];
  /** If true, the command is also exposed in the command palette. Default: true. */
  palette?: boolean;
}

export type RightClickArg = vscode.Uri | undefined;

export interface AppModule {
  manifest: AppManifest;
  handler: (arg: RightClickArg, allUris?: vscode.Uri[]) => unknown | Promise<unknown>;
}

export const COMMAND_PREFIX = 'vibecodeCommitLint';

export function fullCommandId(id: string): string {
  return `${COMMAND_PREFIX}.${id}`;
}

/** Schema for the per-template JSON file (`template.json`). */
export interface CommitLintTemplate {
  /** Short human title shown in the quick-pick. */
  title: string;
  /** Longer description shown beneath the title. */
  description: string;
  /** Files written into the target folder when this template is applied. */
  files: TemplateFile[];
  /**
   * Shell commands to run sequentially in the integrated terminal after files are written.
   * Use for `npm install --save-dev @commitlint/...` and husky setup.
   */
  postInstall?: string[];
}

export interface TemplateFile {
  /** Relative path inside the target folder. */
  path: string;
  /** File body. */
  content: string;
  /** If true, overwrite existing file. Default: false (skip with warning). */
  overwrite?: boolean;
}

export const TEMPLATE_FILENAME = 'template.json';

/** Folder name created beneath the target folder by the `addTemplate` action. */
export const USER_TEMPLATES_DIRNAME = 'commit-lint-templates';
