import * as vscode from 'vscode';
import { McpState } from '../../state';
import { McpTreeProvider } from './provider';
import { TREE_VIEW } from './manifest';

export function registerTreeView(state: McpState): vscode.Disposable {
  const provider = new McpTreeProvider(state);
  return vscode.window.createTreeView(TREE_VIEW.VIEW_ID, {
    treeDataProvider: provider,
    showCollapseAll: true,
  });
}
