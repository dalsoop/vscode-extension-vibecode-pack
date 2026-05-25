export type MenuLocation = 'view/title' | 'view/item/context' | 'commandPalette';

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

export interface ExtensionApi {
  refresh(): Promise<void>;
  toggleView(): string;
  openSettings(): Thenable<unknown>;
}

export interface AppFactory {
  manifest: AppManifest;
  create(api: ExtensionApi): (arg?: unknown, all?: unknown) => unknown | Promise<unknown>;
}

export const COMMAND_PREFIX = 'vibecodeShowFileLines';
export function fullCommandId(id: string): string { return `${COMMAND_PREFIX}.${id}`; }
