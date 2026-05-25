// Shared file-tree helpers used by apply-template and reinstall-tool.

import * as fs from 'fs';
import * as path from 'path';

export interface Conflict {
  rel: string;
}

export interface CopyOpts {
  overwrite: boolean;
}

export async function findConflicts(srcRoot: string, dstRoot: string): Promise<string[]> {
  const conflicts: string[] = [];
  const walk = async (srcDir: string, relDir: string): Promise<void> => {
    const entries = await fs.promises.readdir(srcDir, { withFileTypes: true });
    for (const e of entries) {
      const rel = relDir ? path.join(relDir, e.name) : e.name;
      const dst = path.join(dstRoot, rel);
      if (e.isDirectory()) {
        await walk(path.join(srcDir, e.name), rel);
      } else if (e.isFile()) {
        try {
          await fs.promises.access(dst);
          conflicts.push(rel);
        } catch {
          // not present — no conflict
        }
      }
    }
  };
  await walk(srcRoot, '');
  return conflicts.sort();
}

export async function copyTree(
  srcRoot: string,
  dstRoot: string,
  opts: CopyOpts
): Promise<void> {
  const walk = async (srcDir: string, dstDir: string): Promise<void> => {
    await fs.promises.mkdir(dstDir, { recursive: true });
    const entries = await fs.promises.readdir(srcDir, { withFileTypes: true });
    for (const e of entries) {
      const src = path.join(srcDir, e.name);
      const dst = path.join(dstDir, e.name);
      if (e.isDirectory()) {
        await walk(src, dst);
      } else if (e.isFile()) {
        const exists = await fileExists(dst);
        if (exists && !opts.overwrite) continue;
        await fs.promises.copyFile(src, dst);
      }
    }
  };
  await walk(srcRoot, dstRoot);
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.promises.access(p);
    return true;
  } catch {
    return false;
  }
}
