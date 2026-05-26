import * as path from 'path';
import * as vscode from 'vscode';

export const CONFIG_SECTION = 'vibecodeMdFileBrowser';
export const DEFAULT_INCLUDE_GLOBS = ['**/*.md', '**/*.mdx', '**/*.markdown'];
export const DEFAULT_EXCLUDE_GLOB =
  '{**/node_modules/**,**/.git/**,**/dist/**,**/out/**,**/.next/**}';

export function normalizeStringArray(value: string[] | undefined, fallback: string[]): string[] {
  if (!value) return fallback;
  const clean = value.map(item => item.trim()).filter(Boolean);
  return clean.length > 0 ? clean : fallback;
}

export function debounce(fn: () => void, delay: number): () => void {
  let timer: NodeJS.Timeout | undefined;
  return () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(fn, delay);
  };
}

export function isMarkdownPath(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return ext === '.md' || ext === '.mdx' || ext === '.markdown';
}

export function workspaceRelativePath(uri: vscode.Uri): string {
  const includeWorkspaceFolder = (vscode.workspace.workspaceFolders?.length ?? 0) > 1;
  return vscode.workspace.asRelativePath(uri, includeWorkspaceFolder).replaceAll('\\', '/');
}

export function isUri(input: unknown): input is vscode.Uri {
  return (
    typeof input === 'object' &&
    input !== null &&
    'scheme' in input &&
    'fsPath' in input
  );
}

export async function resolveMarkdownUri(input?: unknown): Promise<vscode.Uri | undefined> {
  if (input && typeof input === 'object' && 'uri' in input && isUri((input as { uri: unknown }).uri)) {
    return (input as { uri: vscode.Uri }).uri;
  }
  if (isUri(input)) return input;
  const activeUri = vscode.window.activeTextEditor?.document.uri;
  if (activeUri && isMarkdownPath(activeUri.fsPath)) return activeUri;
  await vscode.window.showWarningMessage(vscode.l10n.t('Select a Markdown file first.'));
  return undefined;
}

export function defaultOpenCommandId(): string {
  const openMode = vscode.workspace.getConfiguration(CONFIG_SECTION).get<string>('openMode', 'preview');
  return openMode === 'source'
    ? 'vibecodeMdFileBrowser.openSource'
    : 'vibecodeMdFileBrowser.openPreview';
}
