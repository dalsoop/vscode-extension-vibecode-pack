import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export type Locale = 'en' | 'ko';
export type LocaleSetting = 'auto' | Locale;

interface Bundle {
  [key: string]: string;
}

let extensionRoot = '';
let currentLocale: Locale = 'en';
let dict: Bundle = {};
let fallback: Bundle = {};
const changeEmitter = new vscode.EventEmitter<Locale>();
export const onDidChangeLocale = changeEmitter.event;

function readBundle(loc: Locale): Bundle {
  if (!extensionRoot) return {};
  try {
    const file = path.join(extensionRoot, 'l10n', `bundle.${loc}.json`);
    return JSON.parse(fs.readFileSync(file, 'utf8')) as Bundle;
  } catch {
    return {};
  }
}

function resolveLocale(): Locale {
  const setting = vscode.workspace
    .getConfiguration('vibecodeSkills')
    .get<LocaleSetting>('language', 'auto');
  if (setting === 'en' || setting === 'ko') return setting;
  const env = (vscode.env.language || '').toLowerCase();
  return env.startsWith('ko') ? 'ko' : 'en';
}

function reload(): void {
  const next = resolveLocale();
  const changed = next !== currentLocale;
  currentLocale = next;
  dict = readBundle(next);
  if (changed) changeEmitter.fire(next);
}

export function activate(context: vscode.ExtensionContext): void {
  extensionRoot = context.extensionPath;
  fallback = readBundle('en');
  reload();
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('vibecodeSkills.language')) reload();
    }),
    changeEmitter
  );
}

export function getLocale(): Locale {
  return currentLocale;
}

export function getDict(): Bundle {
  // Webviews need a merged view (fallback English fills gaps).
  return { ...fallback, ...dict };
}

export function t(key: string, ...args: Array<string | number>): string {
  const raw = dict[key] ?? fallback[key] ?? key;
  if (!args.length) return raw;
  return raw.replace(/\{(\d+)\}/g, (_m, i) => {
    const v = args[Number(i)];
    return v === undefined ? '' : String(v);
  });
}
