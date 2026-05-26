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
  id: string;
  title: string;
  description: string;
  icon?: string;
  menus: MenuContribution[];
  palette?: boolean;
}

export type RightClickArg = vscode.Uri | undefined;

export interface AppModule {
  manifest: AppManifest;
  handler: (arg: RightClickArg, allUris?: vscode.Uri[]) => unknown | Promise<unknown>;
}

export const COMMAND_PREFIX = 'vibecodeImageRedact';

export function fullCommandId(id: string): string {
  return `${COMMAND_PREFIX}.${id}`;
}
