// Resolves a CanonicalSource.target string into an absolute filesystem path.
// Accepted forms:
//   /abs/path/to/file.md          → as-is
//   ~/path/to/file.md             → expanded against home
//   relative/path.md              → relative to first workspace folder
//   AGENTS.md                     → relative to first workspace folder

import * as path from 'path';
import * as os from 'os';
import * as vscode from 'vscode';
import type { CanonicalSource } from '../types';

export function resolveTarget(target: string): { abs: string | null; reason?: string } {
  if (!target || !target.trim()) return { abs: null, reason: 'empty target' };
  const t = target.trim();
  if (t.startsWith('~/') || t === '~') {
    return { abs: path.join(os.homedir(), t === '~' ? '' : t.slice(2)) };
  }
  if (path.isAbsolute(t)) {
    return { abs: t };
  }
  const ws = vscode.workspace.workspaceFolders?.[0];
  if (!ws) return { abs: null, reason: 'no workspace open for relative target' };
  return { abs: path.join(ws.uri.fsPath, t) };
}

// Stable ID for a source — derived from url + target so re-adding the same
// source dedupes naturally.
export function deriveId(url: string, target: string): string {
  return `${url}|${target}`.replace(/[^a-zA-Z0-9]/g, '-').slice(0, 80);
}

// Default label suggestion from URL filename.
export function deriveLabel(url: string): string {
  try {
    const u = new URL(url);
    const base = path.basename(u.pathname) || u.host;
    return base;
  } catch {
    return url.slice(0, 32);
  }
}

export function withId(s: Omit<CanonicalSource, 'id' | 'label'> & { label?: string }): CanonicalSource {
  return {
    id: deriveId(s.url, s.target),
    label: s.label || deriveLabel(s.url),
    url: s.url,
    target: s.target,
    ref: s.ref,
    autoSync: s.autoSync
  };
}
