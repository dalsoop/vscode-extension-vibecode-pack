// Resolves the example/template counterpart of a primary .env-family file,
// and computes a key-level diff between them.
//
// Interfaced so future strategies (parent-dir walk, monorepo root lookup,
// git-relative lookup, schema.json source) can swap in without touching callers.

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as parser from './env-parser';
import type { EnvFilePatternRegistry } from './file-patterns';

export interface ExampleResolver {
  /** Find the example file paired with `primaryUri`, or null if none exists. */
  resolve(primaryUri: vscode.Uri): Promise<vscode.Uri | null>;
}

export interface SchemaDiff {
  /** Keys present in the example file but missing from the primary. */
  missingKeys: string[];
  /** Keys present in the primary but not in the example. */
  extraKeys: string[];
  /** Keys present in both. */
  commonKeys: string[];
}

/** Looks for an example file sibling to the primary (same directory). */
export class SiblingExampleResolver implements ExampleResolver {
  constructor(private readonly registry: EnvFilePatternRegistry) {}

  async resolve(primaryUri: vscode.Uri): Promise<vscode.Uri | null> {
    const dir = path.dirname(primaryUri.fsPath);
    const candidates = this.registry.ofKind('example').map(p => path.join(dir, p.filename));
    for (const c of candidates) {
      if (await exists(c)) return vscode.Uri.file(c);
    }
    return null;
  }
}

/** Read both files and produce a structural diff of their KEY sets. */
export async function diffSchemas(
  primaryUri: vscode.Uri,
  exampleUri: vscode.Uri
): Promise<SchemaDiff> {
  const [primaryText, exampleText] = await Promise.all([
    fs.promises.readFile(primaryUri.fsPath, 'utf8'),
    fs.promises.readFile(exampleUri.fsPath, 'utf8')
  ]);
  const primaryKeys = new Set(parser.keyList(parser.parse(primaryText)).map(e => e.key));
  const exampleKeys = new Set(parser.keyList(parser.parse(exampleText)).map(e => e.key));

  const missingKeys: string[] = [];
  const commonKeys: string[] = [];
  for (const k of exampleKeys) {
    if (primaryKeys.has(k)) commonKeys.push(k);
    else missingKeys.push(k);
  }
  const extraKeys: string[] = [];
  for (const k of primaryKeys) {
    if (!exampleKeys.has(k)) extraKeys.push(k);
  }
  return {
    missingKeys: missingKeys.sort(),
    extraKeys: extraKeys.sort(),
    commonKeys: commonKeys.sort()
  };
}

async function exists(p: string): Promise<boolean> {
  try {
    await fs.promises.access(p);
    return true;
  } catch {
    return false;
  }
}
