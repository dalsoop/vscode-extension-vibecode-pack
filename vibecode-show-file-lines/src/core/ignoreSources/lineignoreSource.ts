import * as path from 'path';
import { IGNORE_SOURCE_LINEIGNORE, LINEIGNORE_FILENAME } from '../../constants';
import { parseGitignoreText } from './gitignoreSource';
import type { IFileSystem, IIgnoreSource, IgnoreRule, Uri } from '../types';

export class LineignoreSource implements IIgnoreSource {
  readonly id = IGNORE_SOURCE_LINEIGNORE;
  readonly priority = 10;

  constructor(
    private readonly workspaceRoot: string,
    private readonly fs: IFileSystem
  ) {}

  async loadRules(): Promise<IgnoreRule[]> {
    const filePath = path.join(this.workspaceRoot, LINEIGNORE_FILENAME);
    const uri: Uri = { fsPath: filePath, toString: () => `file://${filePath}` };
    try {
      const text = await this.fs.readTextFile(uri);
      return parseGitignoreText(text, this.workspaceRoot);
    } catch {
      return [];
    }
  }
}
