import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import { McpServerEntry, MCP_ORIGIN_KIND } from '../../_types';
import { MCP_SOURCE } from '../_types';
import { parseMcpJson } from '../../parse';

export async function scan(): Promise<McpServerEntry[]> {
  const folders = vscode.workspace.workspaceFolders ?? [];
  const all: McpServerEntry[] = [];
  for (const folder of folders) {
    const file = path.join(folder.uri.fsPath, '.vscode', 'mcp.json');
    let text: string;
    try {
      text = await fs.readFile(file, 'utf8');
    } catch (err) {
      const e = err as NodeJS.ErrnoException;
      if (e.code === 'ENOENT') continue;
      vscode.window.showWarningMessage(
        vscode.l10n.t('Failed to scan {0}: {1}', file, String(err))
      );
      continue;
    }
    const { entries, errors } = parseMcpJson(text);
    if (errors.length > 0) {
      vscode.window.showWarningMessage(
        vscode.l10n.t('Failed to parse {0}: {1}', file, errors.map(e => e.message).join('; '))
      );
    }
    for (const e of entries) {
      all.push({
        name: e.name,
        sourceId: MCP_SOURCE.WORKSPACE_MCP_JSON,
        workspaceFolder: folder.name,
        transport: e.transport,
        command: e.command,
        args: e.args,
        url: e.url,
        port: e.port,
        env: e.env,
        cwd: e.cwd,
        raw: e.raw,
        origin: { kind: MCP_ORIGIN_KIND.FILE, path: file },
      });
    }
  }
  return all;
}

export function watch(onChange: () => void): vscode.Disposable {
  const watcher = vscode.workspace.createFileSystemWatcher('**/.vscode/mcp.json');
  watcher.onDidChange(onChange);
  watcher.onDidCreate(onChange);
  watcher.onDidDelete(onChange);
  const foldersSub = vscode.workspace.onDidChangeWorkspaceFolders(onChange);
  return new vscode.Disposable(() => { watcher.dispose(); foldersSub.dispose(); });
}
