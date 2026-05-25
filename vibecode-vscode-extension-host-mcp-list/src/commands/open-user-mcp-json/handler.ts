import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import type { CommandContext } from '../_types';
import { userMcpJsonPath } from '../../sources/user-mcp-json/scan';

export async function handler(_ctx: CommandContext): Promise<void> {
  const file = userMcpJsonPath();
  try {
    await fs.access(file);
  } catch {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, '{\n  "servers": {}\n}\n');
  }
  const doc = await vscode.workspace.openTextDocument(file);
  await vscode.window.showTextDocument(doc);
}
