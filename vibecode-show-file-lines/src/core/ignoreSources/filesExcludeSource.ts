import { IGNORE_SOURCE_FILES_EXCLUDE } from '../../constants';
import type { IConfigProvider, IIgnoreSource, IgnoreRule } from '../types';

export class FilesExcludeSource implements IIgnoreSource {
  readonly id = IGNORE_SOURCE_FILES_EXCLUDE;
  readonly priority = 30;

  constructor(
    private readonly workspaceRoot: string,
    private readonly config: IConfigProvider
  ) {}

  async loadRules(): Promise<IgnoreRule[]> {
    const map = this.config.get<Record<string, boolean>>('files.exclude', {});
    const rules: IgnoreRule[] = [];
    for (const [pattern, on] of Object.entries(map)) {
      if (on === true) rules.push({ pattern, baseDirFsPath: this.workspaceRoot });
    }
    return rules;
  }
}
