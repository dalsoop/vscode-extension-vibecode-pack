import * as vscode from 'vscode';
import { McpServerEntry } from './_types';
import { SourceId, SourceModule } from './sources/_types';

export class McpState {
  private cache = new Map<SourceId, McpServerEntry[]>();
  private readonly _onDidChange = new vscode.EventEmitter<void>();
  readonly onDidChange = this._onDidChange.event;

  constructor(private sources: readonly SourceModule[]) {}

  async refreshAll(): Promise<void> {
    await Promise.all(this.sources.map(s => this.refreshSource(s.manifest.id)));
  }

  async refreshSource(id: SourceId): Promise<void> {
    const source = this.sources.find(s => s.manifest.id === id);
    if (!source) return;
    try {
      const entries = await source.scan();
      this.cache.set(id, entries);
    } catch (err) {
      this.cache.set(id, []);
      vscode.window.showErrorMessage(vscode.l10n.t('Failed to scan {0}: {1}', id, String(err)));
    }
    this._onDidChange.fire();
  }

  getBySource(id: SourceId): McpServerEntry[] {
    return this.cache.get(id) ?? [];
  }

  getAll(): McpServerEntry[] {
    return [...this.cache.values()].flat();
  }

  dispose(): void {
    this._onDidChange.dispose();
  }
}
