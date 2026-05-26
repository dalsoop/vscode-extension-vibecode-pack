import * as path from 'path';
import * as vscode from 'vscode';
import { FILE_CONTEXT_VALUE, VIEW_ID } from './apps/_types';
import {
  CONFIG_SECTION,
  DEFAULT_EXCLUDE_GLOB,
  DEFAULT_INCLUDE_GLOBS,
  defaultOpenCommandId,
  normalizeStringArray,
  workspaceRelativePath
} from './utils';

type BrowserNode = FolderNode | FileNode | EmptyNode;

export class FolderNode {
  readonly kind = 'folder';

  constructor(
    readonly label: string,
    readonly relativePath: string,
    readonly children: BrowserNode[] = []
  ) {}
}

export class FileNode {
  readonly kind = 'file';

  constructor(
    readonly uri: vscode.Uri,
    readonly relativePath: string
  ) {}

  get label(): string {
    return path.basename(this.relativePath);
  }
}

export class EmptyNode {
  readonly kind = 'empty';

  constructor(readonly label: string) {}
}

export class MarkdownTreeProvider implements vscode.TreeDataProvider<BrowserNode> {
  private readonly changeEmitter = new vscode.EventEmitter<BrowserNode | undefined | null | void>();
  private roots: BrowserNode[] = [];
  private fileCount = 0;

  readonly onDidChangeTreeData = this.changeEmitter.event;

  async refresh(): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      this.roots = [new EmptyNode(vscode.l10n.t('No workspace folder is open.'))];
      this.fileCount = 0;
      this.changeEmitter.fire();
      return;
    }

    const files = await this.findMarkdownFiles();
    this.fileCount = files.length;
    this.roots = files.length > 0
      ? this.buildTree(files)
      : [new EmptyNode(vscode.l10n.t('No Markdown files found.'))];
    await vscode.commands.executeCommand('setContext', `${VIEW_ID}.hasFiles`, files.length > 0);
    this.changeEmitter.fire();
  }

  getTreeItem(element: BrowserNode): vscode.TreeItem {
    if (element.kind === 'folder') {
      const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.Collapsed);
      item.contextValue = 'markdownFolder';
      item.iconPath = new vscode.ThemeIcon('folder');
      item.tooltip = element.relativePath;
      return item;
    }

    if (element.kind === 'file') {
      const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.None);
      const folderPath = path.posix.dirname(element.relativePath);
      item.contextValue = FILE_CONTEXT_VALUE;
      item.description = folderPath === '.' ? undefined : folderPath;
      item.resourceUri = element.uri;
      item.tooltip = element.relativePath;
      item.command = {
        command: defaultOpenCommandId(),
        title: element.label,
        arguments: [element]
      };
      return item;
    }

    const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.None);
    item.contextValue = 'empty';
    item.iconPath = new vscode.ThemeIcon('info');
    return item;
  }

  getChildren(element?: BrowserNode): vscode.ProviderResult<BrowserNode[]> {
    if (!element) return this.roots;
    if (element.kind === 'folder') return element.children;
    return [];
  }

  getParent(element: BrowserNode): vscode.ProviderResult<BrowserNode> {
    if (element.kind !== 'file') return undefined;
    const folderPath = path.posix.dirname(element.relativePath);
    return this.findFolder(folderPath === '.' ? '' : folderPath, this.roots);
  }

  count(): number {
    return this.fileCount;
  }

  private async findMarkdownFiles(): Promise<vscode.Uri[]> {
    const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
    const includeGlobs = normalizeStringArray(config.get<string[]>('includeGlobs'), DEFAULT_INCLUDE_GLOBS);
    const excludeGlob = config.get<string>('excludeGlob', DEFAULT_EXCLUDE_GLOB);
    const byPath = new Map<string, vscode.Uri>();

    for (const glob of includeGlobs) {
      const files = await vscode.workspace.findFiles(glob, excludeGlob);
      for (const uri of files) {
        byPath.set(uri.fsPath, uri);
      }
    }

    return [...byPath.values()].sort((a, b) => {
      const left = workspaceRelativePath(a).toLowerCase();
      const right = workspaceRelativePath(b).toLowerCase();
      return left.localeCompare(right);
    });
  }

  private buildTree(files: vscode.Uri[]): BrowserNode[] {
    const root = new FolderNode('', '');
    const folders = new Map<string, FolderNode>([['', root]]);

    for (const uri of files) {
      const relativePath = workspaceRelativePath(uri);
      const parts = relativePath.split('/').filter(Boolean);
      const fileName = parts.pop();
      if (!fileName) continue;

      let parentPath = '';
      for (const part of parts) {
        const currentPath = parentPath ? `${parentPath}/${part}` : part;
        let folder = folders.get(currentPath);
        if (!folder) {
          folder = new FolderNode(part, currentPath);
          folders.set(currentPath, folder);
          folders.get(parentPath)?.children.push(folder);
        }
        parentPath = currentPath;
      }

      folders.get(parentPath)?.children.push(new FileNode(uri, relativePath));
    }

    this.sortNodes(root.children);
    return root.children;
  }

  private sortNodes(nodes: BrowserNode[]): void {
    nodes.sort((a, b) => {
      if (a.kind === 'folder' && b.kind !== 'folder') return -1;
      if (a.kind !== 'folder' && b.kind === 'folder') return 1;
      return nodeLabel(a).localeCompare(nodeLabel(b), undefined, { sensitivity: 'base' });
    });

    for (const node of nodes) {
      if (node.kind === 'folder') this.sortNodes(node.children);
    }
  }

  private findFolder(relativePath: string, nodes: BrowserNode[]): FolderNode | undefined {
    for (const node of nodes) {
      if (node.kind !== 'folder') continue;
      if (node.relativePath === relativePath) return node;
      const found = this.findFolder(relativePath, node.children);
      if (found) return found;
    }
    return undefined;
  }
}

function nodeLabel(node: BrowserNode): string {
  return node.label;
}

export type { BrowserNode };
