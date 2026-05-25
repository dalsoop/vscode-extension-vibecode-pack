#!/usr/bin/env node
// Walks src/commands/*/manifest.ts and i18n/*.json. Synthesizes:
//   1. package.json `contributes.commands` + `contributes.menus`
//   2. package.nls.json (English) from manifests + scripts/nls-defaults.json
//   3. package.nls.<locale>.json from each i18n/<locale>.json (ext + commands blocks)
//   4. l10n/bundle.l10n.<locale>.json from each i18n/<locale>.json (runtime block)

import { promises as fs } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CMD_DIR = path.join(ROOT, 'src', 'commands');
const I18N_DIR = path.join(ROOT, 'i18n');
const L10N_DIR = path.join(ROOT, 'l10n');
const PKG_PATH = path.join(ROOT, 'package.json');
const DEFAULTS_PATH = path.join(__dirname, 'nls-defaults.json');
const COMMAND_PREFIX = 'vibecodeMcpList';

const CHECK_MODE = process.argv.includes('--check');

async function readManifest(cmdDir) {
  const file = path.join(CMD_DIR, cmdDir, 'manifest.ts');
  const src = await fs.readFile(file, 'utf8');
  const match = src.match(/export const manifest[^=]*=\s*(\{[\s\S]*?\n\});/);
  if (!match) throw new Error(`Cannot parse manifest in ${file}`);
  // Manifests reference MCP_COMMAND constants by name. Replace them with literal strings
  // before evaling so the data-literal sandbox can resolve them.
  const MCP_COMMAND_VALUES = {
    REFRESH: 'refresh',
    OPEN_USER_MCP_JSON: 'openUserMcpJson',
    OPEN_WORKSPACE_MCP_JSON: 'openWorkspaceMcpJson',
    OPEN_DETAIL: 'openDetail',
    COPY_COMMAND: 'copyCommand',
  };
  let literal = match[1];
  for (const [k, v] of Object.entries(MCP_COMMAND_VALUES)) {
    literal = literal.replace(new RegExp(`MCP_COMMAND\\.${k}`, 'g'), JSON.stringify(v));
  }
  return new Function(`return (${literal});`)();
}

async function listCommandDirs() {
  try {
    const entries = await fs.readdir(CMD_DIR, { withFileTypes: true });
    return entries
      .filter(e => e.isDirectory() && !e.name.startsWith('_'))
      .map(e => e.name)
      .sort();
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

async function listLocales() {
  try {
    const entries = await fs.readdir(I18N_DIR, { withFileTypes: true });
    return entries
      .filter(e => e.isFile() && e.name.endsWith('.json'))
      .map(e => e.name.replace(/\.json$/, ''))
      .sort();
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

function nlsKeyForCommand(id) {
  return `cmd.${id}`;
}

function buildContributes(manifests, _existing) {
  const commands = manifests.map(m => ({
    command: `${COMMAND_PREFIX}.${m.id}`,
    title: `%${nlsKeyForCommand(m.id)}%`,
    category: '%ext.category%',
    ...(m.icon ? { icon: `$(${m.icon})` } : {})
  }));

  // Build menus from scratch each time (don't preserve stale entries from previous syncs)
  const menus = {};
  for (const m of manifests) {
    for (const entry of m.menus ?? []) {
      const bucket = (menus[entry.where] ??= []);
      bucket.push({
        command: `${COMMAND_PREFIX}.${m.id}`,
        ...(entry.when ? { when: entry.when } : {}),
        ...(entry.group ? { group: entry.group } : {})
      });
    }
  }
  // commandPalette inclusion list for non-internal commands
  const palette = manifests.filter(m => m.palette !== false);
  if (palette.length) {
    menus.commandPalette = palette.map(m => ({ command: `${COMMAND_PREFIX}.${m.id}` }));
  }
  return { commands, menus };
}

async function buildNlsEn(manifests) {
  const defaults = JSON.parse(await fs.readFile(DEFAULTS_PATH, 'utf8'));
  const nls = { ...defaults };
  for (const m of manifests) {
    nls[nlsKeyForCommand(m.id)] = m.title;
  }
  return nls;
}

function buildNlsLocale(i18n) {
  const out = {};
  for (const [k, v] of Object.entries(i18n.ext ?? {})) {
    out[`ext.${k}`] = v;
  }
  for (const [k, v] of Object.entries(i18n.commands ?? {})) {
    out[nlsKeyForCommand(k)] = v;
  }
  return out;
}

function buildL10nBundle(i18n) {
  return { ...(i18n.runtime ?? {}) };
}

function sortKeys(obj) {
  return Object.fromEntries(Object.entries(obj).sort(([a], [b]) => a.localeCompare(b)));
}

async function writeIfChanged(file, content) {
  const next = typeof content === 'string' ? content : JSON.stringify(content, null, 2) + '\n';
  let prev = '';
  try { prev = await fs.readFile(file, 'utf8'); } catch {}
  if (prev === next) return false;
  if (CHECK_MODE) {
    console.error(`[sync] would change: ${path.relative(ROOT, file)}`);
    return true;
  }
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, next);
  console.log(`[sync] wrote: ${path.relative(ROOT, file)}`);
  return true;
}

async function main() {
  const cmdDirs = await listCommandDirs();
  const manifests = [];
  for (const d of cmdDirs) {
    manifests.push(await readManifest(d));
  }
  manifests.sort((a, b) => a.id.localeCompare(b.id));

  // 1. package.json contributes
  const pkg = JSON.parse(await fs.readFile(PKG_PATH, 'utf8'));
  const built = buildContributes(manifests, pkg.contributes);
  pkg.contributes = {
    ...pkg.contributes,
    commands: built.commands,
    menus: built.menus
  };
  let changed = await writeIfChanged(PKG_PATH, pkg);

  // 2. package.nls.json (English)
  const nlsEn = sortKeys(await buildNlsEn(manifests));
  changed = (await writeIfChanged(path.join(ROOT, 'package.nls.json'), nlsEn)) || changed;

  // 3+4. per-locale nls and l10n bundles
  const locales = await listLocales();
  for (const loc of locales) {
    const i18n = JSON.parse(await fs.readFile(path.join(I18N_DIR, `${loc}.json`), 'utf8'));
    if (loc === 'en') continue; // English seeds package.nls.json
    const nlsLoc = sortKeys(buildNlsLocale(i18n));
    changed = (await writeIfChanged(path.join(ROOT, `package.nls.${loc}.json`), nlsLoc)) || changed;
    const bundle = sortKeys(buildL10nBundle(i18n));
    changed = (await writeIfChanged(path.join(L10N_DIR, `bundle.l10n.${loc}.json`), bundle)) || changed;
  }

  if (CHECK_MODE && changed) process.exit(1);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
