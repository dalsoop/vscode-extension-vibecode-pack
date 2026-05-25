// Recursive directory → ItemPayload tree. Used by data sources that want to
// expose folder-depth in the hub sidebar (e.g. SkillSource lists each skill
// dir's files as children).

import * as fs from 'fs';
import * as path from 'path';
import { countLines } from '../analyzer';
import type { ItemPayload } from '../types';

// Skip line-counting huge files (binary blobs, generated bundles).
const LINE_COUNT_BYTE_LIMIT = 2_000_000;

// Hard cap to keep accidental traversal of deep repos cheap.
const MAX_DEPTH = 4;

// Always-skipped directory names regardless of caller options.
const DEFAULT_SKIP = new Set(['.git', 'node_modules', 'dist', 'out', '.cache']);

export interface FolderTreeOptions {
  /** Extra names (files or dirs) to skip. Merged with DEFAULT_SKIP. */
  excludeNames?: ReadonlySet<string>;
  /** Action ids attached to each leaf item. Defaults to ['open', 'finder']. */
  fileActions?: ItemPayload['actions'];
}

function safeLineCount(abs: string, size: number): number {
  if (size > LINE_COUNT_BYTE_LIMIT) return 0;
  try {
    return countLines(fs.readFileSync(abs, 'utf8'));
  } catch {
    return 0;
  }
}

function listInto(dir: string, depth: number, opts: FolderTreeOptions): ItemPayload[] {
  if (depth > MAX_DEPTH) return [];
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const skip = opts.excludeNames;
  const fileActions = opts.fileActions ?? ['open', 'finder'];
  const out: ItemPayload[] = [];
  for (const e of entries) {
    if (e.name.startsWith('.')) continue;
    if (DEFAULT_SKIP.has(e.name)) continue;
    if (skip?.has(e.name)) continue;
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) {
      const children = listInto(abs, depth + 1, opts);
      out.push({
        id: abs,
        title: e.name,
        path: abs,
        kind: 'folder',
        metric: { count: children.length, unit: 'items' },
        actions: ['finder'],
        children
      });
    } else if (e.isFile()) {
      let size = 0;
      try {
        size = fs.statSync(abs).size;
      } catch {
        continue;
      }
      out.push({
        id: abs,
        title: e.name,
        path: abs,
        kind: 'file',
        metric: { count: safeLineCount(abs, size), unit: 'lines' },
        actions: fileActions
      });
    }
  }
  // Folders first, then files, alphabetical within each group.
  return out.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'folder' ? -1 : 1;
    return a.title.localeCompare(b.title);
  });
}

export function readFolderTree(dir: string, opts: FolderTreeOptions = {}): ItemPayload[] {
  return listInto(dir, 0, opts);
}
