import * as path from 'path';
import * as fs from 'fs';
import { extensionRoot } from '../lib/templateUtils';
import { CHECKS_DIRNAME, CHECK_FILENAME } from './types';

const BUNDLED_DIRNAME = 'bundled-checks';

export interface SeedResult {
  written: string[];
  skipped: string[];
  targetRoot: string;
}

/** Copy each bundled-checks/<dir>/check.json to <workspaceFolder>/.vibecode/file-lint/<dir>/check.json. Skip existing dirs. */
export async function copySeedChecks(workspaceFolder: string): Promise<SeedResult> {
  const src = path.join(extensionRoot(), BUNDLED_DIRNAME);
  const dst = path.join(workspaceFolder, CHECKS_DIRNAME);
  await fs.promises.mkdir(dst, { recursive: true });

  const written: string[] = [];
  const skipped: string[] = [];
  let entries: fs.Dirent[];
  try {
    entries = await fs.promises.readdir(src, { withFileTypes: true });
  } catch {
    return { written, skipped, targetRoot: dst };
  }
  for (const e of entries
    .filter(e => e.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name))) {
    const srcFile = path.join(src, e.name, CHECK_FILENAME);
    const dstDir = path.join(dst, e.name);
    const dstFile = path.join(dstDir, CHECK_FILENAME);
    if (fs.existsSync(dstFile)) {
      skipped.push(e.name);
      continue;
    }
    try {
      const raw = await fs.promises.readFile(srcFile, 'utf8');
      await fs.promises.mkdir(dstDir, { recursive: true });
      await fs.promises.writeFile(dstFile, raw, 'utf8');
      written.push(e.name);
    } catch {
      skipped.push(e.name);
    }
  }
  return { written, skipped, targetRoot: dst };
}
