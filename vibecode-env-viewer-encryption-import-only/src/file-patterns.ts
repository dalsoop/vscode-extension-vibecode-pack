// Declarative registry of .env-family file patterns this extension handles.
//
// IMPORTANT: The "primary" globs here MUST stay in sync with the
// `contributes.customEditors[0].selector` list in package.json. VSCode reads the
// package.json selector statically at extension load time; this registry is the
// runtime mirror so handlers/resolvers don't hardcode strings.

import * as vscode from 'vscode';
import * as path from 'path';

/** Kind of .env-family file. */
export type EnvFileKind = 'primary' | 'example';

export interface EnvFilePattern {
  /** Exact filename to match. Matched against `path.basename(uri.fsPath)`. */
  filename: string;
  /** primary = a real .env containing secrets. example = a shareable schema template. */
  kind: EnvFileKind;
}

export interface EnvFilePatternRegistry {
  readonly patterns: readonly EnvFilePattern[];
  /** Classify a URI against the registry. Returns the kind, or null if no match. */
  classify(uri: vscode.Uri): EnvFileKind | null;
  /** Filter to patterns of a given kind. */
  ofKind(kind: EnvFileKind): readonly EnvFilePattern[];
}

export const DEFAULT_PATTERNS: readonly EnvFilePattern[] = [
  // Primary — intercepted by our custom editor.
  { filename: '.env', kind: 'primary' },
  { filename: '.env.local', kind: 'primary' },
  { filename: '.env.development', kind: 'primary' },
  { filename: '.env.production', kind: 'primary' },
  { filename: '.env.staging', kind: 'primary' },
  // Example/template — not intercepted, but used to derive a schema diff against the primary.
  { filename: '.env.example', kind: 'example' },
  { filename: '.env.template', kind: 'example' },
  { filename: '.env.schema', kind: 'example' },
  { filename: '.env.sample', kind: 'example' }
];

export class DefaultPatternRegistry implements EnvFilePatternRegistry {
  constructor(public readonly patterns: readonly EnvFilePattern[] = DEFAULT_PATTERNS) {}

  classify(uri: vscode.Uri): EnvFileKind | null {
    const name = path.basename(uri.fsPath);
    return this.patterns.find(p => p.filename === name)?.kind ?? null;
  }

  ofKind(kind: EnvFileKind): readonly EnvFilePattern[] {
    return this.patterns.filter(p => p.kind === kind);
  }
}
