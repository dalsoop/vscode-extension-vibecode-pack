import * as path from 'path';
import ignore, { type Ignore } from 'ignore';
import type { Disposable, IIgnoreResolver, IIgnoreSource, Uri } from './types';

export class IgnoreResolver implements IIgnoreResolver {
  /** Map of baseDirFsPath -> compiled ignore matcher. */
  private matchers = new Map<string, Ignore>();
  private listeners = new Set<() => void>();

  constructor(
    private readonly workspaceRoot: string,
    private readonly sources: readonly IIgnoreSource[]
  ) {}

  isIgnored(uri: Uri): boolean {
    const rel = path.relative(this.workspaceRoot, uri.fsPath);
    if (rel.startsWith('..') || path.isAbsolute(rel)) return false;
    const matcher = this.matchers.get(this.workspaceRoot);
    if (!matcher) return false;
    return matcher.ignores(toPosix(rel));
  }

  async reload(): Promise<void> {
    const grouped = new Map<string, string[]>();
    const ordered = [...this.sources].sort((a, b) => a.priority - b.priority);
    for (const src of ordered) {
      const rules = await src.loadRules();
      for (const r of rules) {
        const bucket = grouped.get(r.baseDirFsPath) ?? [];
        bucket.push(r.pattern);
        grouped.set(r.baseDirFsPath, bucket);
      }
    }
    const next = new Map<string, Ignore>();
    for (const [base, patterns] of grouped) {
      next.set(base, ignore().add(patterns));
    }
    this.matchers = next;
    for (const l of this.listeners) l();
  }

  onReload(cb: () => void): Disposable {
    this.listeners.add(cb);
    return { dispose: () => this.listeners.delete(cb) };
  }
}

function toPosix(p: string): string {
  return p.split(path.sep).join('/');
}
