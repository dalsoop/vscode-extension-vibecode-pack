import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import type { CommandContext } from '../_types';

async function openOrCreate(file: string): Promise<void> {
  try {
    await fs.access(file);
  } catch {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, '{\n  "servers": {}\n}\n');
  }
  const doc = await vscode.workspace.openTextDocument(file);
  await vscode.window.showTextDocument(doc);
}

export async function handler(_ctx: CommandContext): Promise<void> {
  const folders = vscode.workspace.workspaceFolders ?? [];
  if (folders.length === 0) {
    void vscode.window.showInformationMessage(vscode.l10n.t('No workspace folder is open.'));
    return;
  }
  if (folders.length === 1) {
    await openOrCreate(path.join(folders[0].uri.fsPath, '.vscode', 'mcp.json'));
    return;
  }
  const picked = await vscode.window.showQuickPick(
    folders.map(f => ({ label: f.name, description: f.uri.fsPath, folder: f })),
    { placeHolder: 'Select workspace folder' }
  );
  if (!picked) return;
  await openOrCreate(path.join(picked.folder.uri.fsPath, '.vscode', 'mcp.json'));
}
