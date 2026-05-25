import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { extensionNamePart, isVibecodeExtensionId } from './apps/_types';

export interface ExtensionEntry {
  extensionId: string;
  displayName: string;
  commands: CommandEntry[];
}

export interface CommandEntry {
  commandId: string;
  title: string;
  category?: string;
  iconCodicon?: string;
}

type NlsMap = Record<string, string>;

/**
 * Self extension id captured at activation time so loadCatalog can exclude it
 * without any handler having to know it. Set once via setSelfExtensionId().
 */
let selfExtensionId = '';

export function setSelfExtensionId(id: string): void {
  selfExtensionId = id;
}

/**
 * Enumerate all installed vibecode-* extensions (excluding self) and the commands
 * each one contributes. Matches by name part — any publisher works. NLS placeholders
 * in titles/categories are resolved against the extension's own
 * package.nls.<lang>.json / package.nls.json on disk.
 */
export async function loadCatalog(): Promise<ExtensionEntry[]> {
  const out: ExtensionEntry[] = [];
  const language = vscode.env.language;

  for (const ext of vscode.extensions.all) {
    if (!isVibecodeExtensionId(ext.id)) continue;
    if (ext.id === selfExtensionId) continue;

    const pkg = ext.packageJSON ?? {};
    const nls = await loadNls(ext.extensionUri.fsPath, language);
    const displayName = resolveNls(pkg.displayName, nls) ?? extensionNamePart(ext.id);
    const declared: any[] = pkg.contributes?.commands ?? [];

    const commands: CommandEntry[] = declared.map(cmd => ({
      commandId: cmd.command,
      title: resolveNls(cmd.title, nls) ?? cmd.command,
      category: resolveNls(cmd.category, nls),
      iconCodicon: parseCodicon(cmd.icon)
    }));

    out.push({ extensionId: ext.id, displayName, commands });
  }

  out.sort((a, b) => a.displayName.localeCompare(b.displayName));
  return out;
}

async function loadNls(extDir: string, language: string): Promise<NlsMap> {
  const localized = await readJsonOrEmpty(path.join(extDir, `package.nls.${language}.json`));
  const fallback = await readJsonOrEmpty(path.join(extDir, 'package.nls.json'));
  return { ...fallback, ...localized };
}

async function readJsonOrEmpty(file: string): Promise<NlsMap> {
  try {
    const raw = await fs.promises.readFile(file, 'utf8');
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed ? parsed : {};
  } catch {
    return {};
  }
}

function resolveNls(value: unknown, nls: NlsMap): string | undefined {
  if (typeof value !== 'string') return undefined;
  const match = value.match(/^%(.+)%$/);
  if (!match) return value;
  return nls[match[1]];
}

function parseCodicon(icon: unknown): string | undefined {
  if (typeof icon !== 'string') return undefined;
  const match = icon.match(/^\$\(([^)]+)\)$/);
  return match ? match[1] : undefined;
}
