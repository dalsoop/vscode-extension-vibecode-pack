import type { AppManifest } from '../_types';

export const manifest: AppManifest = {
  id: 'showCatalog',
  title: 'Vibecode - Show Extension Menu Catalog',
  description:
    'List every installed vibecode-* extension and its registered commands in a QuickPick. Selecting an item runs the command via vscode.commands.executeCommand.',
  icon: 'list-tree',
  menus: [
    {
      where: 'vibecodeMenu.explorerContext',
      group: '9_meta@99'
    },
    {
      where: 'vibecodeMenu.editorContext',
      group: '9_meta@99'
    }
  ]
};
