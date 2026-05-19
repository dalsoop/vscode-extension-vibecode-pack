import * as vscode from 'vscode';

export type BusEvent = 'data-changed' | 'config-changed' | 'favorites-changed';

class Bus {
  private em = new vscode.EventEmitter<BusEvent>();

  on(cb: (event: BusEvent) => void): vscode.Disposable {
    return this.em.event(cb);
  }

  emit(event: BusEvent): void {
    this.em.fire(event);
  }

  dispose(): void {
    this.em.dispose();
  }
}

export const bus = new Bus();
