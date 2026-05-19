// Back-compat shim — real interactive preview lives in src/preview/.
import * as vscode from 'vscode';
import { open as openInteractive, type PreviewPayload } from '../preview/controller';

let extensionPathCache: string | null = null;
export function setExtensionPath(p: string): void {
  extensionPathCache = p;
}

export function open(payload: PreviewPayload): void {
  if (!extensionPathCache) {
    const ext = vscode.extensions.getExtension('dalsoop.claude-codex-skills-viewer');
    extensionPathCache = ext?.extensionPath ?? '';
  }
  openInteractive(payload, extensionPathCache);
}

export type { PreviewPayload };
