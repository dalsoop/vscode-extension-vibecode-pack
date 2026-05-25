import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { McpServerEntry, MCP_ORIGIN_KIND } from '../../_types';
import { MCP_SOURCE } from '../_types';
import { parseMcpJson } from '../../parse';

export function userMcpJsonPath(): string {
  return path.join(os.homedir(), '.vscode', 'mcp.json');
}

export async function scan(): Promise<McpServerEntry[]> {
  const file = userMcpJsonPath();
  let text: string;
  try {
    text = await fs.readFile(file, 'utf8');
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    if (e.code === 'ENOENT') return [];
    throw err;
  }
  const { entries, errors } = parseMcpJson(text);
  if (errors.length > 0) {
    vscode.window.showWarningMessage(
      vscode.l10n.t('Failed to parse {0}: {1}', file, errors.map(e => e.message).join('; '))
    );
  }
  return entries.map<McpServerEntry>(e => ({
    name: e.name,
    sourceId: MCP_SOURCE.USER_MCP_JSON,
    transport: e.transport,
    command: e.command,
    args: e.args,
    url: e.url,
    port: e.port,
    env: e.env,
    cwd: e.cwd,
    raw: e.raw,
    origin: { kind: MCP_ORIGIN_KIND.FILE, path: file },
  }));
}

export function watch(onChange: () => void): vscode.Disposable {
  const file = userMcpJsonPath();
  const watcher = vscode.workspace.createFileSystemWatcher(
    new vscode.RelativePattern(vscode.Uri.file(path.dirname(file)), path.basename(file))
  );
  watcher.onDidChange(onChange);
  watcher.onDidCreate(onChange);
  watcher.onDidDelete(onChange);
  return watcher;
}
