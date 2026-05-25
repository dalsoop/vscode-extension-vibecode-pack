// Sidebar = catalog of templates with tool-variant checkboxes.
//
// Tree layout:
//   <template-name>             (expandable, description shows "(N tools, M selected)")
//     ☑ <tool>                  (leaf, checkbox via TreeItem.checkboxState)
//     ☐ <tool>
//
// Selection state lives in the provider (`Map<template, Set<tool>>`), persisted via
// `context.workspaceState` so reopening keeps it. The "Apply Selected" view-title button
// reads `getSelections()` and runs install for each pair.

import * as vscode from 'vscode';
import * as fs from 'fs';

const VIEW_ID = 'vibecodeAiMdSystem.templates';
const TEMPLATES_SUBDIR = 'templates';
const STORAGE_KEY = 'vibecodeAiMdSystem.selectedTools';
const HAS_SELECTION_CONTEXT = 'vibecodeAiMdSystem.hasSelection';
const SETTINGS_NAMESPACE = 'vibecodeAiMdSystem';
const SETTING_DEFAULT_TOOL = 'defaultTool';

interface TemplateNode {
  kind: 'template';
  name: string;
  rootUri: vscode.Uri;
  tools: string[];
}

interface ToolNode {
  kind: 'tool';
  templateName: string;
  templateRootUri: vscode.Uri;
  tool: string;
}

type TreeNode = TemplateNode | ToolNode;

export interface Selection {
  templateName: string;
  tool: string;
  variantRootUri: vscode.Uri;
}

export class TemplatesProvider implements vscode.TreeDataProvider<TreeNode> {
  private readonly _onDidChange = new vscode.EventEmitter<TreeNode | undefined>();
  readonly onDidChangeTreeData = this._onDidChange.event;

  /** template name → set of selected tool names */
  private selection: Map<string, Set<string>>;
  /** templates loaded from disk on last `loadTemplates()` */
  private templates: TemplateNode[] = [];
  /** Track which templates have had defaults applied (so toggling off doesn't auto-re-check) */
  private defaultsApplied = new Set<string>();

  constructor(
    private readonly ctx: vscode.ExtensionContext,
    private readonly extensionUri: vscode.Uri
  ) {
    const stored = ctx.workspaceState.get<Record<string, string[]>>(STORAGE_KEY) ?? {};
    this.selection = new Map(Object.entries(stored).map(([k, v]) => [k, new Set(v)]));
    // Templates whose state was loaded from storage have already had their defaults handled.
    for (const k of this.selection.keys()) this.defaultsApplied.add(k);
    this.updateContext();
  }

  refresh(): void {
    this._onDidChange.fire(undefined);
  }

  getTreeItem(node: TreeNode): vscode.TreeItem {
    if (node.kind === 'template') {
      const checked = this.selection.get(node.name)?.size ?? 0;
      const item = new vscode.TreeItem(node.name, vscode.TreeItemCollapsibleState.Collapsed);
      item.description = `(${node.tools.length} tool${node.tools.length === 1 ? '' : 's'}${checked > 0 ? `, ${checked} selected` : ''})`;
      item.iconPath = new vscode.ThemeIcon('rocket');
      item.contextValue = 'templateItem';
      item.tooltip = node.rootUri.fsPath;
      return item;
    }
    const isChecked = this.isToolSelected(node.templateName, node.tool);
    const item = new vscode.TreeItem(node.tool, vscode.TreeItemCollapsibleState.None);
    item.checkboxState = isChecked
      ? vscode.TreeItemCheckboxState.Checked
      : vscode.TreeItemCheckboxState.Unchecked;
    item.contextValue = 'toolItem';
    if (node.tool === this.defaultTool()) item.description = 'default';
    item.tooltip = vscode.Uri.joinPath(node.templateRootUri, node.tool).fsPath;
    return item;
  }

  async getChildren(node?: TreeNode): Promise<TreeNode[]> {
    if (!node) {
      this.templates = await this.loadTemplates();
      // Apply default-tool seed for templates we haven't seen before.
      const defaultTool = this.defaultTool();
      let changed = false;
      for (const t of this.templates) {
        if (this.defaultsApplied.has(t.name)) continue;
        if (t.tools.includes(defaultTool)) {
          const set = this.selection.get(t.name) ?? new Set<string>();
          set.add(defaultTool);
          this.selection.set(t.name, set);
          changed = true;
        }
        this.defaultsApplied.add(t.name);
      }
      if (changed) {
        this.persist();
        this.updateContext();
      }
      return this.templates;
    }
    if (node.kind === 'template') {
      return node.tools.map(tool => ({
        kind: 'tool',
        templateName: node.name,
        templateRootUri: node.rootUri,
        tool
      }));
    }
    return [];
  }

  // --- selection mutation ---

  setToolSelected(templateName: string, tool: string, selected: boolean): void {
    const set = this.selection.get(templateName) ?? new Set<string>();
    if (selected) set.add(tool); else set.delete(tool);
    if (set.size > 0) this.selection.set(templateName, set);
    else this.selection.delete(templateName);
    this.persist();
    this.updateContext();
    this._onDidChange.fire(undefined); // refresh parent description
  }

  getSelections(): Selection[] {
    const out: Selection[] = [];
    for (const t of this.templates) {
      const set = this.selection.get(t.name);
      if (!set) continue;
      for (const tool of set) {
        if (!t.tools.includes(tool)) continue; // stale — tool no longer exists
        out.push({
          templateName: t.name,
          tool,
          variantRootUri: vscode.Uri.joinPath(t.rootUri, tool)
        });
      }
    }
    return out;
  }

  clearSelection(): void {
    this.selection.clear();
    this.persist();
    this.updateContext();
    this._onDidChange.fire(undefined);
  }

  // --- internals ---

  private isToolSelected(templateName: string, tool: string): boolean {
    return this.selection.get(templateName)?.has(tool) ?? false;
  }

  private defaultTool(): string {
    return vscode.workspace
      .getConfiguration(SETTINGS_NAMESPACE)
      .get<string>(SETTING_DEFAULT_TOOL, 'claude');
  }

  private persist(): void {
    const obj: Record<string, string[]> = {};
    for (const [k, v] of this.selection) obj[k] = Array.from(v);
    this.ctx.workspaceState.update(STORAGE_KEY, obj);
  }

  private updateContext(): void {
    const total = Array.from(this.selection.values()).reduce((acc, s) => acc + s.size, 0);
    vscode.commands.executeCommand('setContext', HAS_SELECTION_CONTEXT, total > 0);
  }

  private async loadTemplates(): Promise<TemplateNode[]> {
    const dir = vscode.Uri.joinPath(this.extensionUri, TEMPLATES_SUBDIR);
    try {
      const entries = await fs.promises.readdir(dir.fsPath, { withFileTypes: true });
      const templates: TemplateNode[] = [];
      for (const e of entries) {
        if (!e.isDirectory()) continue;
        const rootUri = vscode.Uri.joinPath(dir, e.name);
        const tools = await listTools(rootUri.fsPath);
        templates.push({ kind: 'template', name: e.name, rootUri, tools });
      }
      return templates.sort((a, b) => a.name.localeCompare(b.name));
    } catch {
      return [];
    }
  }
}

async function listTools(templateDir: string): Promise<string[]> {
  try {
    const entries = await fs.promises.readdir(templateDir, { withFileTypes: true });
    return entries.filter(e => e.isDirectory()).map(e => e.name).sort();
  } catch {
    return [];
  }
}

export function registerSidebar(context: vscode.ExtensionContext): TemplatesProvider {
  const provider = new TemplatesProvider(context, context.extensionUri);
  const view = vscode.window.createTreeView<TreeNode>(VIEW_ID, {
    treeDataProvider: provider,
    manageCheckboxStateManually: true
  });
  context.subscriptions.push(view);

  view.onDidChangeCheckboxState(e => {
    for (const [node, state] of e.items) {
      if (node.kind !== 'tool') continue;
      provider.setToolSelected(
        node.templateName,
        node.tool,
        state === vscode.TreeItemCheckboxState.Checked
      );
    }
  });

  return provider;
}
