import * as vscode from 'vscode';

export async function handler(node: unknown): Promise<void> {
  const uri = extractUri(node);
  if (!uri) return;
  await vscode.commands.executeCommand('revealFileInOS', uri);
}

function extractUri(node: unknown): vscode.Uri | undefined {
  if (!node || typeof node !== 'object') return undefined;
  const n = node as {
    kind?: string;
    rootUri?: vscode.Uri;
    templateRootUri?: vscode.Uri;
    tool?: string;
  };
  if (n.kind === 'template' && n.rootUri) return n.rootUri;
  if (n.kind === 'tool' && n.templateRootUri && n.tool) {
    return vscode.Uri.joinPath(n.templateRootUri, n.tool);
  }
  return undefined;
}
