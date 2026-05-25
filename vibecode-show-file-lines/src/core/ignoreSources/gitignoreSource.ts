import * as path from 'path';
import { GITIGNORE_FILENAME, IGNORE_SOURCE_GITIGNORE } from '../../constants';
import type { IFileSystem, IIgnoreSource, IgnoreRule, Uri } from '../types';

export class GitignoreSource implements IIgnoreSource {
  readonly id = IGNORE_SOURCE_GITIGNORE;
  readonly priority = 20;

  constructor(
    private readonly workspaceRoot: string,
    private readonly fs: IFileSystem
  ) {}

  async loadRules(): Promise<IgnoreRule[]> {
    const filePath = path.join(this.workspaceRoot, GITIGNORE_FILENAME);
    const uri: Uri = { fsPath: filePath, toString: () => `file://${filePath}` };
    let text: string;
    try {
      text = await this.fs.readTextFile(uri);
    } catch {
      return [];
    }
    return parseGitignoreText(text, this.workspaceRoot);
  }
}

export function parseGitignoreText(text: string, baseDirFsPath: string): IgnoreRule[] {
  const out: IgnoreRule[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    out.push({ pattern: line, baseDirFsPath });
  }
  return out;
}
