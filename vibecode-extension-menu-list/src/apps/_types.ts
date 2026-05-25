import type * as vscode from 'vscode';

/**
 * Menu locations this extension can target.
 *
 * Native VSCode locations (explorer/context, editor/context, editor/title) plus the
 * three shared `vibecodeMenu.*` submenu ids declared by this extension. Other
 * vibecode-* extensions reference the submenu ids from their own contributes.menus
 * to slot their items under the unified "Vibecode" submenu.
 */
export type MenuLocation =
  | 'explorer/context'
  | 'editor/context'
  | 'editor/title'
  | 'editor/title/context'
  | 'vibecodeMenu.explorerContext'
  | 'vibecodeMenu.editorContext'
  | 'vibecodeMenu.editorTitle';

export interface MenuContribution {
  where: MenuLocation;
  when?: string;
  group?: string;
}

export interface AppManifest {
  /** Stable id used inside the codebase. Becomes the command id namespaced under `vibecodeMenuList.<id>`. */
  id: string;
  /** Human-readable command title shown in palettes and menus. Default (English) — used in package.nls.json. */
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

export const COMMAND_PREFIX = 'vibecodeMenuList';

export function fullCommandId(id: string): string {
  return `${COMMAND_PREFIX}.${id}`;
}

/** Submenu ids this extension declares — re-export for documentation and lookup. */
export const SUBMENU_IDS = {
  explorerContext: 'vibecodeMenu.explorerContext',
  editorContext: 'vibecodeMenu.editorContext',
  editorTitle: 'vibecodeMenu.editorTitle'
} as const;

/** Prefix used to identify sibling extensions in the catalog. */
export const VIBECODE_EXTENSION_PREFIX = 'dalsoop.vibecode-';
