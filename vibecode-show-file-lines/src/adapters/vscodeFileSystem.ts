import * as vscode from 'vscode';
import type { IFileSystem, Uri } from '../core/types';

export class VsCodeFileSystem implements IFileSystem {
  async readFile(uri: Uri): Promise<Uint8Array> {
    return vscode.workspace.fs.readFile(toVsc(uri));
  }
  async stat(uri: Uri): Promise<{ size: number; mtime: number }> {
    const s = await vscode.workspace.fs.stat(toVsc(uri));
    return { size: s.size, mtime: s.mtime };
  }
  async *findFiles(include: string, exclude?: string): AsyncIterable<Uri> {
    const found = await vscode.workspace.findFiles(include, exclude ?? null);
    for (const u of found) yield u as unknown as Uri;
  }
  async readTextFile(uri: Uri): Promise<string> {
    const bytes = await vscode.workspace.fs.readFile(toVsc(uri));
    return new TextDecoder().decode(bytes);
  }
}

function toVsc(uri: Uri): vscode.Uri {
  return uri instanceof vscode.Uri ? uri : vscode.Uri.file(uri.fsPath);
}
