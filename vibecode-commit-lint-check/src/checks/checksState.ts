import * as vscode from 'vscode';
import type { CheckRunRecord, CheckState } from './types';

interface Entry {
  state: CheckState;
  lastRecord: CheckRunRecord | null;
}

export class ChecksState {
  private readonly map = new Map<string, Entry>();
  private readonly emitter = new vscode.EventEmitter<string | undefined>();
  readonly onDidChange = this.emitter.event;

  get(id: string): Entry {
    return this.map.get(id) ?? { state: { kind: 'idle' }, lastRecord: null };
  }

  setState(id: string, state: CheckState): void {
    const prev = this.get(id);
    this.map.set(id, { ...prev, state });
    this.emitter.fire(id);
  }

  setResult(id: string, state: CheckState, record: CheckRunRecord): void {
    this.map.set(id, { state, lastRecord: record });
    this.emitter.fire(id);
  }

  dispose(): void {
    this.emitter.dispose();
  }
}
