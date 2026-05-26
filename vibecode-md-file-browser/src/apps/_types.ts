import type * as vscode from 'vscode';

export type MenuLocation =
  | 'explorer/context'
  | 'editor/context'
  | 'editor/title'
  | 'editor/title/context'
  | 'view/title'
  | 'view/item/context';

export interface MenuContribution {
  where: MenuLocation;
  when?: string;
  group?: string;
}

export interface AppManifest {
  id: string;
  title: string;
  description: string;
  icon?: string;
  menus: MenuContribution[];
  palette?: boolean;
}

export type AppArg = vscode.Uri | undefined;

export interface AppModule {
  manifest: AppManifest;
  handler: (arg: AppArg, allUris?: vscode.Uri[]) => unknown | Promise<unknown>;
}

export const COMMAND_PREFIX = 'vibecodeMdFileBrowser';
export const VIEW_ID = 'vibecodeMdFileBrowser.files';
export const FILE_CONTEXT_VALUE = 'markdownFile';

export function fullCommandId(id: string): string {
  return `${COMMAND_PREFIX}.${id}`;
}
