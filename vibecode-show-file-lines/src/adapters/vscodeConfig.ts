import * as vscode from 'vscode';
import { EXTENSION_ID } from '../constants';
import type { IConfigProvider, Disposable } from '../core/types';

/**
 * Reads from the extension namespace by default, but supports dotted absolute keys
 * (e.g. "files.exclude") by looking up the root configuration.
 */
export class VsCodeConfig implements IConfigProvider {
  get<T>(key: string, fallback: T): T {
    if (key.includes('.')) {
      const [section, ...rest] = key.split('.');
      const v = vscode.workspace.getConfiguration(section).get<T>(rest.join('.'));
      return (v ?? fallback) as T;
    }
    const v = vscode.workspace.getConfiguration(EXTENSION_ID).get<T>(key);
    return (v ?? fallback) as T;
  }
  onChange(keys: string[], cb: () => void): Disposable {
    const sub = vscode.workspace.onDidChangeConfiguration(e => {
      for (const k of keys) {
        const section = k.includes('.') ? k.split('.')[0] : EXTENSION_ID;
        const tail = k.includes('.') ? k : `${EXTENSION_ID}.${k}`;
        if (e.affectsConfiguration(tail) || e.affectsConfiguration(section)) { cb(); return; }
      }
    });
    return { dispose: () => sub.dispose() };
  }
}
