import * as path from 'path';
import * as fs from 'fs';
import {
  TEMPLATE_FILENAME,
  USER_TEMPLATES_DIRNAME,
  type CommitLintTemplate,
  type TemplateFile
} from '../apps/_types';

export type TemplateSource = 'bundled' | 'user';

export interface TemplateEntry {
  /** Absolute path to the template's own directory (contains template.json). */
  dir: string;
  /** Display name — directory basename when title is missing. */
  name: string;
  source: TemplateSource;
  template: CommitLintTemplate;
}

export interface ApplyResult {
  written: string[];
  skipped: string[];
}

/**
 * Resolve the extension root directory from a built dist/extension.js location.
 */
export function extensionRoot(): string {
  return path.resolve(__dirname, '..', '..');
}

export async function readBundledTemplates(): Promise<TemplateEntry[]> {
  const root = path.join(extensionRoot(), 'templates');
  return readTemplatesIn(root, 'bundled');
}

export async function readUserTemplates(workspaceFolder: string): Promise<TemplateEntry[]> {
  const root = path.join(workspaceFolder, USER_TEMPLATES_DIRNAME);
  return readTemplatesIn(root, 'user');
}

async function readTemplatesIn(root: string, source: TemplateSource): Promise<TemplateEntry[]> {
  const out: TemplateEntry[] = [];
  let entries: fs.Dirent[];
  try {
    entries = await fs.promises.readdir(root, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isDirectory()) continue;
    const dir = path.join(root, entry.name);
    const file = path.join(dir, TEMPLATE_FILENAME);
    try {
      const raw = await fs.promises.readFile(file, 'utf8');
      const parsed = JSON.parse(raw) as CommitLintTemplate;
      if (Array.isArray(parsed.files)) {
        out.push({ dir, name: parsed.title || entry.name, source, template: parsed });
      }
    } catch {
      // ignore malformed entries
    }
  }
  return out;
}

export async function readTemplateAt(dir: string): Promise<CommitLintTemplate | undefined> {
  try {
    const raw = await fs.promises.readFile(path.join(dir, TEMPLATE_FILENAME), 'utf8');
    const parsed = JSON.parse(raw) as CommitLintTemplate;
    if (Array.isArray(parsed.files)) return parsed;
  } catch {
    // ignore
  }
  return undefined;
}

export async function applyTemplateFiles(
  targetFolder: string,
  template: CommitLintTemplate
): Promise<ApplyResult> {
  const written: string[] = [];
  const skipped: string[] = [];
  for (const file of template.files) {
    const result = await writeTemplateFile(targetFolder, file);
    if (result === 'written') written.push(file.path);
    else if (result === 'skipped') skipped.push(file.path);
  }
  return { written, skipped };
}

async function writeTemplateFile(
  targetFolder: string,
  file: TemplateFile
): Promise<'written' | 'skipped'> {
  const fullPath = path.join(targetFolder, file.path);
  if (fs.existsSync(fullPath) && !file.overwrite) return 'skipped';
  await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.promises.writeFile(fullPath, file.content, 'utf8');
  return 'written';
}
