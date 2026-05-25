// Sidebar = catalog of templates (bundled + user) with tool-variant checkboxes.
//
// Tree layout:
//   <origin-group>                       (📦 Bundled | 👤 User)
//     <template-name>                    (expandable, "(N tools, M selected)")
//       ☑ <tool>  default               (leaf — checkbox; "(installed)" if present in workspace)
//
// Pre-flight check: each tool leaf compares against `vscode.workspace.workspaceFolders[0]`.
// If the tool's marker (`.claude`, `.codex`, etc.) is already present in that workspace, the
// item shows "(installed)" and the checkbox is auto-unchecked + tooltip explains why. The
// apply handler additionally filters installed tools out before copy.
//
// Selection state persisted via `context.workspaceState`.

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { detectInstalledTools } from './tool-markers';

const VIEW_ID = 'vibecodeAiMdSystem.templates';
const BUNDLED_SUBDIR = 'templates';
const USER_TEMPLATES_DIR = path.join(os.homedir(), '.vibecode-ai-md-system', 'templates');
const STORAGE_KEY = 'vibecodeAiMdSystem.selectedTools';
const HAS_SELECTION_CONTEXT = 'vibecodeAiMdSystem.hasSelection';
const SETTINGS_NAMESPACE = 'vibecodeAiMdSystem';
const SETTING_DEFAULT_TOOL = 'defaultTool';

export type Origin = 'bundled' | 'user';

interface OriginGroupNode {
  kind: 'origin';
  origin: Origin;
  templates: TemplateRef[];
}

interface TemplateNode {
  kind: 'template';
  origin: Origin;
  name: string;
  rootUri: vscode.Uri;
  tools: string[];
}

interface ToolNode {
  kind: 'tool';
  origin: Origin;
  templateName: string;
  templateRootUri: vscode.Uri;
  tool: string;
}

type TreeNode = OriginGroupNode | TemplateNode | ToolNode;

interface TemplateRef {
  origin: Origin;
  name: string;
  rootUri: vscode.Uri;
  tools: string[];
}

export interface Selection {
  templateName: string;
  origin: Origin;
  tool: string;
  variantRootUri: vscode.Uri;
}

export class TemplatesProvider implements vscode.TreeDataProvider<TreeNode> {
  private readonly _onDidChange = new vscode.EventEmitter<TreeNode | undefined>();
  readonly onDidChangeTreeData = this._onDidChange.event;

  /** key: `${origin}::${templateName}`, value: set of tool names selected */
  private selection: Map<string, Set<string>>;
  private allTemplates: TemplateRef[] = [];
  /** Per-template, tools detected as already installed in the current workspace root. */
  private installedByTemplate = new Map<string, Set<string>>();
  private defaultsApplied = new Set<string>();

  constructor(
    private readonly ctx: vscode.ExtensionContext,
    private readonly extensionUri: vscode.Uri
  ) {
    const stored = ctx.workspaceState.get<Record<string, string[]>>(STORAGE_KEY) ?? {};
    this.selection = new Map(Object.entries(stored).map(([k, v]) => [k, new Set(v)]));
    for (const k of this.selection.keys()) this.defaultsApplied.add(k);
    this.updateContext();
  }

  refresh(): void {
    this._onDidChange.fire(undefined);
  }

  getTreeItem(node: TreeNode): vscode.TreeItem {
    if (node.kind === 'origin') {
      const label = node.origin === 'bundled' ? 'Bundled' : 'User';
      const icon = node.origin === 'bundled' ? 'package' : 'person';
      const item = new vscode.TreeItem(`${label} (${node.templates.length})`, vscode.TreeItemCollapsibleState.Expanded);
      item.iconPath = new vscode.ThemeIcon(icon);
      item.contextValue = `originGroup-${node.origin}`;
      return item;
    }
    if (node.kind === 'template') {
      const checked = this.selection.get(this.selectionKey(node.origin, node.name))?.size ?? 0;
      const installed = this.installedByTemplate.get(this.selectionKey(node.origin, node.name))?.size ?? 0;
      const tail = checked > 0 ? `, ${checked} selected` : installed > 0 ? `, ${installed} installed` : '';
      const item = new vscode.TreeItem(node.name, vscode.TreeItemCollapsibleState.Collapsed);
      item.description = `(${node.tools.length} tool${node.tools.length === 1 ? '' : 's'}${tail})`;
      item.iconPath = new vscode.ThemeIcon('rocket');
      item.contextValue = `templateItem-${node.origin}`;
      item.tooltip = node.rootUri.fsPath;
      return item;
    }
    const isInstalled = this.installedByTemplate
      .get(this.selectionKey(node.origin, node.templateName))
      ?.has(node.tool) ?? false;
    const isChecked = this.isToolSelected(node.origin, node.templateName, node.tool);
    const item = new vscode.TreeItem(node.tool, vscode.TreeItemCollapsibleState.None);
    // If already installed → force-unchecked + cannot toggle on. (Apply handler also filters them.)
    item.checkboxState = isChecked && !isInstalled
      ? vscode.TreeItemCheckboxState.Checked
      : vscode.TreeItemCheckboxState.Unchecked;
    // contextValue encodes installed state so the right-click "Re-install" action only shows on installed leaves.
    item.contextValue = isInstalled ? 'toolItem-installed' : 'toolItem-installable';
    const parts: string[] = [];
    if (isInstalled) parts.push('installed');
    if (node.tool === this.defaultTool()) parts.push('default');
    item.description = parts.join(' · ') || undefined;
    item.tooltip = isInstalled
      ? `${vscode.Uri.joinPath(node.templateRootUri, node.tool).fsPath}\n\nAlready present in workspace root.`
      : vscode.Uri.joinPath(node.templateRootUri, node.tool).fsPath;
    return item;
  }

  async getChildren(node?: TreeNode): Promise<TreeNode[]> {
    if (!node) {
      this.allTemplates = await this.loadAllTemplates();
      await this.refreshInstalledMap();
      this.seedDefaults();
      const bundled = this.allTemplates.filter(t => t.origin === 'bundled');
      const user = this.allTemplates.filter(t => t.origin === 'user');
      const groups: OriginGroupNode[] = [
        { kind: 'origin', origin: 'bundled', templates: bundled }
      ];
      if (user.length > 0) groups.push({ kind: 'origin', origin: 'user', templates: user });
      return groups;
    }
    if (node.kind === 'origin') {
      return node.templates.map(t => ({
        kind: 'template',
        origin: t.origin,
        name: t.name,
        rootUri: t.rootUri,
        tools: t.tools
      }));
    }
    if (node.kind === 'template') {
      return node.tools.map(tool => ({
        kind: 'tool',
        origin: node.origin,
        templateName: node.name,
        templateRootUri: node.rootUri,
        tool
      }));
    }
    return [];
  }

  // --- selection mutation ---

  setToolSelected(origin: Origin, templateName: string, tool: string, selected: boolean): void {
    const key = this.selectionKey(origin, templateName);
    // Block selecting tools already installed in workspace — fail-safe matching the visual disable.
    if (selected && this.installedByTemplate.get(key)?.has(tool)) {
      // Revert the visual via refresh; nothing recorded.
      this._onDidChange.fire(undefined);
      return;
    }
    const set = this.selection.get(key) ?? new Set<string>();
    if (selected) set.add(tool); else set.delete(tool);
    if (set.size > 0) this.selection.set(key, set);
    else this.selection.delete(key);
    this.persist();
    this.updateContext();
    this._onDidChange.fire(undefined);
  }

  getSelections(): Selection[] {
    const out: Selection[] = [];
    for (const t of this.allTemplates) {
      const key = this.selectionKey(t.origin, t.name);
      const set = this.selection.get(key);
      if (!set) continue;
      const installed = this.installedByTemplate.get(key) ?? new Set();
      for (const tool of set) {
        if (!t.tools.includes(tool)) continue;
        if (installed.has(tool)) continue;
        out.push({
          templateName: t.name,
          origin: t.origin,
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

  private selectionKey(origin: Origin, templateName: string): string {
    return `${origin}::${templateName}`;
  }

  private isToolSelected(origin: Origin, templateName: string, tool: string): boolean {
    return this.selection.get(this.selectionKey(origin, templateName))?.has(tool) ?? false;
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

  private seedDefaults(): void {
    const defaultTool = this.defaultTool();
    let changed = false;
    for (const t of this.allTemplates) {
      const key = this.selectionKey(t.origin, t.name);
      if (this.defaultsApplied.has(key)) continue;
      const installed = this.installedByTemplate.get(key) ?? new Set();
      // Seed only if the default tool exists for this template AND isn't already installed.
      if (t.tools.includes(defaultTool) && !installed.has(defaultTool)) {
        const set = this.selection.get(key) ?? new Set<string>();
        set.add(defaultTool);
        this.selection.set(key, set);
        changed = true;
      }
      this.defaultsApplied.add(key);
    }
    if (changed) {
      this.persist();
      this.updateContext();
    }
  }

  private async refreshInstalledMap(): Promise<void> {
    this.installedByTemplate.clear();
    const wsRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!wsRoot) return;
    const installedTools = new Set(await detectInstalledTools(wsRoot));
    for (const t of this.allTemplates) {
      const key = this.selectionKey(t.origin, t.name);
      const present = new Set(t.tools.filter(tool => installedTools.has(tool)));
      if (present.size > 0) this.installedByTemplate.set(key, present);
    }
  }

  private async loadAllTemplates(): Promise<TemplateRef[]> {
    const bundledDir = vscode.Uri.joinPath(this.extensionUri, BUNDLED_SUBDIR);
    const [bundled, user] = await Promise.all([
      loadTemplatesFrom(bundledDir.fsPath, 'bundled'),
      loadTemplatesFrom(USER_TEMPLATES_DIR, 'user')
    ]);
    return [...bundled, ...user];
  }
}

async function loadTemplatesFrom(dir: string, origin: Origin): Promise<TemplateRef[]> {
  try {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    const out: TemplateRef[] = [];
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      const rootPath = path.join(dir, e.name);
      const tools = await listTools(rootPath);
      out.push({
        origin,
        name: e.name,
        rootUri: vscode.Uri.file(rootPath),
        tools
      });
    }
    return out.sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
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
        node.origin,
        node.templateName,
        node.tool,
        state === vscode.TreeItemCheckboxState.Checked
      );
    }
  });

  // Refresh when workspace root changes (different project opened → different "installed" set).
  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders(() => provider.refresh())
  );

  return provider;
}

/** Exposed so the promote handler can target the same user dir. */
export const USER_TEMPLATES_ROOT = USER_TEMPLATES_DIR;
