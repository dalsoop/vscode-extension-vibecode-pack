import type * as vscode from 'vscode';

export type MenuLocation =
  | 'explorer/context'
  | 'editor/context'
  | 'editor/title/context'
  | 'editor/title';

export interface MenuContribution {
  where: MenuLocation;
  when?: string;
  group?: string;
}

export interface AppManifest {
  /** Stable id used inside the codebase. Becomes the command id namespaced under `rcaActions.<id>`. */
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

export const COMMAND_PREFIX = 'rcaActions';

export function fullCommandId(id: string): string {
  return `${COMMAND_PREFIX}.${id}`;
}
