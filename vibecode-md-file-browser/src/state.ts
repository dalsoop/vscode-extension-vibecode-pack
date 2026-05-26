import type * as vscode from 'vscode';
import type { MarkdownTreeProvider } from './tree-provider';

interface ExtensionState {
  provider: MarkdownTreeProvider;
  treeView: vscode.TreeView<unknown>;
}

let state: ExtensionState | undefined;

export function setState(next: ExtensionState): void {
  state = next;
}

export function getState(): ExtensionState {
  if (!state) throw new Error('vibecode-md-file-browser not activated');
  return state;
}
