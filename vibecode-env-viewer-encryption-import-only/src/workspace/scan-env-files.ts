// Workspace scanner — finds every .env* file in the current workspace and
// classifies each one by its encryption state. Used by the hub webview to
// render the per-file action list.
//
// Excludes:
//   - .env.keys (private-key file — never opened in the editor)
//   - .env.example / .env.template (schema files — handled by the existing example-resolver)
//   - paths inside node_modules / dist / .git

import * as vscode from 'vscode';
import * as path from 'path';
import * as parser from '../env-parser';
import { ENCRYPTED_VALUE_PREFIX } from '../crypto/constants';

export type EncryptionState =
  | { kind: 'empty'; total: 0 }
  | { kind: 'plaintext'; total: number }
  | { kind: 'encrypted'; total: number }
  | { kind: 'mixed'; total: number; encrypted: number };

export interface EnvFileSummary {
  fsPath: string;
  relativePath: string;
  state: EncryptionState;
  hasKeysFile: boolean;
}

const INCLUDE_GLOB = '**/.env*';
const EXCLUDE_GLOB = '**/{node_modules,dist,.git}/**';

export async function scanEnvFiles(): Promise<EnvFileSummary[]> {
  const uris = await vscode.workspace.findFiles(INCLUDE_GLOB, EXCLUDE_GLOB);
  const filtered = uris.filter(uri => !isExcludedName(path.basename(uri.fsPath)));
  const summaries = await Promise.all(filtered.map(toSummary));
  summaries.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  return summaries;
}

function isExcludedName(basename: string): boolean {
  return (
    basename === '.env.keys' ||
    basename === '.env.example' ||
    basename === '.env.template' ||
    basename === '.env.sample'
  );
}

async function toSummary(uri: vscode.Uri): Promise<EnvFileSummary> {
  const text = await readOrEmpty(uri.fsPath);
  const lines = parser.parse(text);
  const entries = lines.filter(
    (l): l is parser.EnvKvLine => l.type === 'kv' && !isPublicKeyLine(l.key)
  );

  const total = entries.length;
  const encryptedCount = entries.filter(e => isEncryptedRaw(e.rawValue)).length;
  const state = classify(total, encryptedCount);

  const keysPath = path.join(path.dirname(uri.fsPath), '.env.keys');
  const hasKeysFile = await fileExists(keysPath);

  return {
    fsPath: uri.fsPath,
    relativePath: vscode.workspace.asRelativePath(uri, false),
    state,
    hasKeysFile
  };
}

function classify(total: number, encrypted: number): EncryptionState {
  if (total === 0) return { kind: 'empty', total: 0 };
  if (encrypted === 0) return { kind: 'plaintext', total };
  if (encrypted === total) return { kind: 'encrypted', total };
  return { kind: 'mixed', total, encrypted };
}

function isPublicKeyLine(key: string): boolean {
  // DOTENV_PUBLIC_KEY and per-env variants don't count as user-managed keys.
  return key === 'DOTENV_PUBLIC_KEY' || key.startsWith('DOTENV_PUBLIC_KEY_');
}

function isEncryptedRaw(rawValue: string): boolean {
  const t = rawValue.trim().replace(/^["']|["']$/g, '');
  return t.startsWith(ENCRYPTED_VALUE_PREFIX);
}

async function readOrEmpty(fsPath: string): Promise<string> {
  try {
    const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(fsPath));
    return doc.getText();
  } catch {
    return '';
  }
}

async function fileExists(fsPath: string): Promise<boolean> {
  try {
    await vscode.workspace.fs.stat(vscode.Uri.file(fsPath));
    return true;
  } catch {
    return false;
  }
}
