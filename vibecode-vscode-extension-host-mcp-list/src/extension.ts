import * as vscode from 'vscode';
import { McpState } from './state';
import { ALL_SOURCES } from './sources';
import { ALL_COMMANDS } from './commands';
import { fullCommandId } from './_types';
import { registerTreeView } from './views/tree';
import { DetailPanel } from './views/detail-panel/panel';

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  DetailPanel.init(context);

  const state = new McpState(ALL_SOURCES);
  context.subscriptions.push({ dispose: () => state.dispose() });

  context.subscriptions.push(registerTreeView(state));

  for (const cmd of ALL_COMMANDS) {
    const id = fullCommandId(cmd.manifest.id);
    context.subscriptions.push(
      vscode.commands.registerCommand(id, (...args) => cmd.handler({ state, args }))
    );
  }

  for (const source of ALL_SOURCES) {
    if (source.watch) {
      context.subscriptions.push(source.watch(() => { void state.refreshSource(source.manifest.id); }));
    }
  }

  await state.refreshAll();
}

export function deactivate(): void {
  // subscriptions disposed automatically
}
