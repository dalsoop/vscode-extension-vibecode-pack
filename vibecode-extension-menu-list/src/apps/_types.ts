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

/**
 * Name-part prefix used to identify sibling extensions. VSCode extension ids are
 * `<publisher>.<name>` — we match on the `<name>` part so any publisher works
 * (dalsoop.vibecode-foo, otheruser.vibecode-bar, ...).
 */
export const VIBECODE_NAME_PREFIX = 'vibecode-';

/**
 * Return the `<name>` part of `<publisher>.<name>`, or '' if malformed.
 */
export function extensionNamePart(extensionId: string): string {
  const dot = extensionId.indexOf('.');
  return dot === -1 ? '' : extensionId.slice(dot + 1);
}

/** True if this extension id matches the vibecode-* naming convention (any publisher). */
export function isVibecodeExtensionId(extensionId: string): boolean {
  return extensionNamePart(extensionId).startsWith(VIBECODE_NAME_PREFIX);
}
