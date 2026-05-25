// Sidebar = catalog of templates (bundled under `<extension>/templates/`).
// Each top-level folder of `templates/` is one template (a use-case recipe).
// Each template has tool-specific subfolders (claude, codex, gemini, …) that get applied.
// Clicking a template starts the 2-step apply flow via `vibecodeAgentInit.applyTemplate`.

import * as vscode from 'vscode';
import * as fs from 'fs';

const VIEW_ID = 'vibecodeAgentInit.templates';
const TEMPLATES_SUBDIR = 'templates';

export interface TemplateRef {
  /** Absolute path of the template folder under <extension>/templates/<name>/. */
  rootUri: vscode.Uri;
  /** Folder name (the template's id). */
  name: string;
  /** Tool variant subfolder names (claude/, codex/, etc.) discovered inside. */
  tools: string[];
}

interface EntryNode {
  kind: 'entry';
  template: TemplateRef;
}

type TreeNode = EntryNode;

export class TemplatesProvider implements vscode.TreeDataProvider<TreeNode> {
  private readonly _onDidChange = new vscode.EventEmitter<TreeNode | undefined>();
  readonly onDidChangeTreeData = this._onDidChange.event;

  constructor(private readonly extensionUri: vscode.Uri) {}

  refresh(): void {
    this._onDidChange.fire(undefined);
  }

  getTreeItem(node: TreeNode): vscode.TreeItem {
    const item = new vscode.TreeItem(node.template.name, vscode.TreeItemCollapsibleState.None);
    item.iconPath = new vscode.ThemeIcon('rocket');
    item.contextValue = 'templateItem';
    const toolsLabel = node.template.tools.join(' · ') || '(no tool variants)';
    item.description = toolsLabel;
    item.tooltip = `${node.template.rootUri.fsPath}\nTools: ${toolsLabel}\n\nClick to apply.`;
    item.command = {
      command: 'vibecodeAgentInit.applyTemplate',
      title: 'Apply template…',
      arguments: [node.template.rootUri]
    };
    return item;
  }

  async getChildren(): Promise<TreeNode[]> {
    const templates = await this.listTemplates();
    return templates.map(template => ({ kind: 'entry', template }));
  }

  private async listTemplates(): Promise<TemplateRef[]> {
    const dir = vscode.Uri.joinPath(this.extensionUri, TEMPLATES_SUBDIR);
    try {
      const entries = await fs.promises.readdir(dir.fsPath, { withFileTypes: true });
      const templates: TemplateRef[] = [];
      for (const e of entries) {
        if (!e.isDirectory()) continue;
        const templateDir = vscode.Uri.joinPath(dir, e.name);
        const tools = await listTools(templateDir.fsPath);
        templates.push({ rootUri: templateDir, name: e.name, tools });
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
    return entries
      .filter(e => e.isDirectory())
      .map(e => e.name)
      .sort();
  } catch {
    return [];
  }
}

export function registerSidebar(context: vscode.ExtensionContext): TemplatesProvider {
  const provider = new TemplatesProvider(context.extensionUri);
  const view = vscode.window.createTreeView(VIEW_ID, { treeDataProvider: provider });
  context.subscriptions.push(view);
  return provider;
}
