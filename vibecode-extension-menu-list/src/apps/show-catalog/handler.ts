import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { VIBECODE_EXTENSION_PREFIX } from '../_types';

interface CatalogItem extends vscode.QuickPickItem {
  commandId: string;
  extensionId: string;
}

interface ExtensionCommandDecl {
  command: string;
  title?: string;
  category?: string;
}

const SELF_ID = 'dalsoop.vibecode-extension-menu-list';

export async function handler(): Promise<void> {
  const items: CatalogItem[] = [];

  for (const ext of vscode.extensions.all) {
    if (!ext.id.startsWith(VIBECODE_EXTENSION_PREFIX)) continue;
    if (ext.id === SELF_ID) continue;

    const pkg = ext.packageJSON ?? {};
    const nls = await loadNls(ext.extensionUri.fsPath, vscode.env.language);
    const extLabel = resolve(pkg.displayName, nls) ?? ext.id.replace(VIBECODE_EXTENSION_PREFIX, '');
    const declared: ExtensionCommandDecl[] = pkg.contributes?.commands ?? [];

    for (const cmd of declared) {
      const title = resolve(cmd.title, nls) ?? cmd.command;
      const category = resolve(cmd.category, nls);
      items.push({
        label: title,
        description: category ?? '',
        detail: `${extLabel}  •  ${cmd.command}`,
        commandId: cmd.command,
        extensionId: ext.id
      });
    }
  }

  if (items.length === 0) {
    vscode.window.showInformationMessage(
      vscode.l10n.t('No vibecode-* extensions with commands found.')
    );
    return;
  }

  items.sort((a, b) => {
    const ext = a.extensionId.localeCompare(b.extensionId);
    return ext !== 0 ? ext : a.label.localeCompare(b.label);
  });

  const picked = await vscode.window.showQuickPick(items, {
    title: vscode.l10n.t('Vibecode extension command catalog ({0} commands)', String(items.length)),
    placeHolder: vscode.l10n.t('Type to filter — select to run'),
    matchOnDescription: true,
    matchOnDetail: true
  });
  if (!picked) return;

  try {
    await vscode.commands.executeCommand(picked.commandId);
  } catch (err) {
    vscode.window.showErrorMessage(
      vscode.l10n.t('Failed to run {0}: {1}', picked.commandId, String((err as Error).message))
    );
  }
}

type NlsMap = Record<string, string>;

async function loadNls(extDir: string, language: string): Promise<NlsMap> {
  // Locale-specific file takes precedence; default fills in misses.
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

/**
 * Resolve a `%nls.key%` placeholder against the loaded NLS map.
 * Plain strings pass through; unresolved placeholders return undefined so the caller can fall back.
 */
function resolve(value: unknown, nls: NlsMap): string | undefined {
  if (typeof value !== 'string') return undefined;
  const match = value.match(/^%(.+)%$/);
  if (!match) return value;
  return nls[match[1]];
}
