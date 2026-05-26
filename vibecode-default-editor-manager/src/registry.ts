
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface CustomEditorEntry {
  viewType: string;
  displayName: string;
  /** Selector globs (e.g. `*.png`). */
  selectors: string[];
  /** `default` | `option` | `builtin`. */
  priority: string;
  /** `<publisher>.<name>` of the contributing extension. */
  sourceExtensionId: string;
  /** Display name of the contributing extension (NLS-resolved). */
  sourceDisplayName: string;
}

type NlsMap = Record<string, string>;

interface RawCustomEditor {
  viewType?: unknown;
  displayName?: unknown;
  selector?: unknown;
  priority?: unknown;
}

export async function loadCustomEditors(): Promise<CustomEditorEntry[]> {
  const out: CustomEditorEntry[] = [];
  const language = vscode.env.language;

  for (const ext of vscode.extensions.all) {
    const pkg = ext.packageJSON ?? {};
    const declared: unknown = pkg.contributes?.customEditors;
    if (!Array.isArray(declared) || declared.length === 0) continue;

    const nls = await loadNls(ext.extensionUri.fsPath, language);
    const sourceDisplayName = resolveNls(pkg.displayName, nls) ?? ext.id;

    for (const raw of declared as RawCustomEditor[]) {
      if (typeof raw.viewType !== 'string') continue;
      const selectors = Array.isArray(raw.selector)
        ? raw.selector
            .map(s => (s && typeof s === 'object' ? (s as { filenamePattern?: string }).filenamePattern : null))
            .filter((s): s is string => typeof s === 'string')
        : [];
      out.push({
        viewType: raw.viewType,
        displayName: resolveNls(raw.displayName, nls) ?? (typeof raw.displayName === 'string' ? raw.displayName : raw.viewType),
        selectors,
        priority: typeof raw.priority === 'string' ? raw.priority : 'default',
        sourceExtensionId: ext.id,
        sourceDisplayName,
      });
    }
  }

  out.sort((a, b) => {
    const ext = a.sourceExtensionId.localeCompare(b.sourceExtensionId);
    return ext !== 0 ? ext : a.viewType.localeCompare(b.viewType);
  });
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
