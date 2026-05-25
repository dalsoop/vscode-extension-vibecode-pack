import * as vscode from 'vscode';
import type { Disposable, IFileWatcher, Uri } from '../core/types';

export class VsCodeWatcher implements IFileWatcher {
  watch(glob: string) {
    const w = vscode.workspace.createFileSystemWatcher(glob);
    return {
      onCreate(cb: (uri: Uri) => void): Disposable {
        const sub = w.onDidCreate(u => cb(u as unknown as Uri));
        return { dispose: () => sub.dispose() };
      },
      onChange(cb: (uri: Uri) => void): Disposable {
        const sub = w.onDidChange(u => cb(u as unknown as Uri));
        return { dispose: () => sub.dispose() };
      },
      onDelete(cb: (uri: Uri) => void): Disposable {
        const sub = w.onDidDelete(u => cb(u as unknown as Uri));
        return { dispose: () => sub.dispose() };
      },
      dispose: () => w.dispose()
    };
  }
}
