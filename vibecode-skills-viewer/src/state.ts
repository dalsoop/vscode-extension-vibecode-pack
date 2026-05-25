import * as vscode from 'vscode';
import { bus } from './bus';

const FAVORITES_KEY = 'vibeskills.favorites';
const INSTALL_TIMES_KEY = 'vibeskills.installTimes';
const RECENT_KEY = 'vibeskills.recent';
const NEW_BADGE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

let ctx: vscode.ExtensionContext | null = null;

export function init(extensionContext: vscode.ExtensionContext): void {
  ctx = extensionContext;
}

function get<T>(key: string, def: T): T {
  return ctx ? (ctx.globalState.get<T>(key, def) ?? def) : def;
}
function set<T>(key: string, val: T): Thenable<void> | undefined {
  return ctx?.globalState.update(key, val);
}

export function isFavorite(dir: string): boolean {
  return get<string[]>(FAVORITES_KEY, []).includes(dir);
}

export async function toggleFavorite(dir: string): Promise<boolean> {
  const favs = new Set(get<string[]>(FAVORITES_KEY, []));
  if (favs.has(dir)) favs.delete(dir);
  else favs.add(dir);
  await set(FAVORITES_KEY, [...favs]);
  bus.emit('favorites-changed');
  return favs.has(dir);
}

export function listFavorites(): string[] {
  return get<string[]>(FAVORITES_KEY, []);
}

export async function markInstalled(dir: string): Promise<void> {
  const times = get<Record<string, number>>(INSTALL_TIMES_KEY, {});
  times[dir] = Date.now();
  await set(INSTALL_TIMES_KEY, times);
}

export function isNew(dir: string): boolean {
  const times = get<Record<string, number>>(INSTALL_TIMES_KEY, {});
  const t = times[dir];
  if (!t) return false;
  return Date.now() - t < NEW_BADGE_MAX_AGE_MS;
}

export async function pushRecent(dir: string): Promise<void> {
  let recents = get<string[]>(RECENT_KEY, []);
  recents = [dir, ...recents.filter(d => d !== dir)].slice(0, 20);
  await set(RECENT_KEY, recents);
}

export function listRecents(): string[] {
  return get<string[]>(RECENT_KEY, []);
}

export async function removeInstallTime(dir: string): Promise<void> {
  const times = get<Record<string, number>>(INSTALL_TIMES_KEY, {});
  delete times[dir];
  await set(INSTALL_TIMES_KEY, times);
}
