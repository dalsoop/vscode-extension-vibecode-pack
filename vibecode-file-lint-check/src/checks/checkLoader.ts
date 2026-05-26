import * as path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';
import { CHECKS_DIRNAME, CHECK_FILENAME, type CheckDefinition, type CheckEntry } from './types';

export function checksRootFor(workspaceFolder: string): string {
  const configured = vscode.workspace
    .getConfiguration('vibecodeFileLint')
    .get<string>('checksRoot', CHECKS_DIRNAME);
  const checksRoot = configured.trim() || CHECKS_DIRNAME;
  if (path.isAbsolute(checksRoot)) return path.join(workspaceFolder, CHECKS_DIRNAME);
  const resolved = path.resolve(workspaceFolder, checksRoot);
  const rel = path.relative(workspaceFolder, resolved);
  if (rel.startsWith('..') || path.isAbsolute(rel)) return path.join(workspaceFolder, CHECKS_DIRNAME);
  return resolved;
}

/** Lexicographic by folder name; folders without check.json are skipped silently. */
export async function loadChecks(workspaceFolder: string): Promise<CheckEntry[]> {
  const root = checksRootFor(workspaceFolder);
  let entries: fs.Dirent[];
  try {
    entries = await fs.promises.readdir(root, { withFileTypes: true });
  } catch {
    return [];
  }
  const dirs = entries.filter(e => e.isDirectory()).sort((a, b) => a.name.localeCompare(b.name));
  const out: CheckEntry[] = [];
  for (const d of dirs) {
    const dir = path.join(root, d.name);
    const file = path.join(dir, CHECK_FILENAME);
    let raw: string;
    try {
      raw = await fs.promises.readFile(file, 'utf8');
    } catch {
      continue; // folder without check.json — skip
    }
    out.push(buildEntry(d.name, dir, raw, workspaceFolder));
  }
  return out;
}

function buildEntry(id: string, dir: string, raw: string, workspaceFolder: string): CheckEntry {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    return { id, dir, parsed: { ok: false, error: `Invalid JSON: ${(err as Error).message}` } };
  }
  const def = parsed as Partial<CheckDefinition>;
  if (typeof def.command !== 'string' || def.command.trim() === '') {
    return { id, dir, parsed: { ok: false, error: 'Missing or empty "command".' } };
  }
  if (def.cwd !== undefined && typeof def.cwd !== 'string') {
    return { id, dir, parsed: { ok: false, error: '"cwd" must be a string.' } };
  }
  if (def.cwd && escapesWorkspace(def.cwd, workspaceFolder)) {
    return { id, dir, parsed: { ok: false, error: '"cwd" must stay inside the workspace.' } };
  }
  if (def.expectExit !== undefined && typeof def.expectExit !== 'number') {
    return { id, dir, parsed: { ok: false, error: '"expectExit" must be a number.' } };
  }
  if (def.shell !== undefined && typeof def.shell !== 'boolean') {
    return { id, dir, parsed: { ok: false, error: '"shell" must be a boolean.' } };
  }
  const definition: CheckDefinition = {
    command: def.command,
    label: typeof def.label === 'string' ? def.label : undefined,
    description: typeof def.description === 'string' ? def.description : undefined,
    expectExit: def.expectExit ?? 0,
    cwd: def.cwd ?? '.',
    shell: def.shell ?? true
  };
  const resolvedLabel = definition.label?.trim() || stripPrefix(id);
  return { id, dir, parsed: { ok: true, definition, resolvedLabel } };
}

function stripPrefix(id: string): string {
  return id.replace(/^\d+[-_]/, '');
}

function escapesWorkspace(cwd: string, workspaceFolder: string): boolean {
  const resolved = path.resolve(workspaceFolder, cwd);
  const rel = path.relative(workspaceFolder, resolved);
  return rel.startsWith('..') || path.isAbsolute(rel);
}
