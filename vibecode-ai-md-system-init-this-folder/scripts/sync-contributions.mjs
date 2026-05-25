#!/usr/bin/env node
// Walks src/apps/* and i18n/*.json, synthesizes:
//   1. package.json `contributes.commands` + `contributes.menus` (using %nls% placeholders)
//   2. package.nls.json (default / English) from manifests + scripts/nls-defaults.json
//   3. package.nls.<locale>.json from each i18n/<locale>.json (ext + commands blocks)
//   4. l10n/bundle.l10n.<locale>.json from each i18n/<locale>.json (runtime block)
//
// Sources of truth:
//   - English: each app's `manifest.title` + scripts/nls-defaults.json
//   - Other locales: i18n/<locale>.json — one file per language, sections { ext, commands, runtime }
//
// Usage:
//   node scripts/sync-contributions.mjs          # write all generated files
//   node scripts/sync-contributions.mjs --check  # exit 1 if anything would change

import { promises as fs } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const APPS_DIR = path.join(ROOT, 'src', 'apps');
const I18N_DIR = path.join(ROOT, 'i18n');
const L10N_DIR = path.join(ROOT, 'l10n');
const PKG_PATH = path.join(ROOT, 'package.json');
const DEFAULTS_PATH = path.join(__dirname, 'nls-defaults.json');
const COMMAND_PREFIX = 'vibecodeAiMdSystem';

const CHECK_MODE = process.argv.includes('--check');

async function readManifest(appDir) {
  const file = path.join(APPS_DIR, appDir, 'manifest.ts');
  const src = await fs.readFile(file, 'utf8');
  const match = src.match(/export const manifest[^=]*=\s*(\{[\s\S]*?\n\});/);
  if (!match) throw new Error(`Cannot parse manifest in ${file}`);
  // Manifests are pure data literals — safe to eval in a Function sandbox.
  return new Function(`return (${match[1]});`)();
}

async function listAppDirs() {
  const entries = await fs.readdir(APPS_DIR, { withFileTypes: true });
  return entries
    .filter(e => e.isDirectory() && !e.name.startsWith('_'))
    .map(e => e.name)
    .sort();
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

function buildContributes(manifests) {
  const commands = manifests.map(m => ({
    command: `${COMMAND_PREFIX}.${m.id}`,
    title: `%${nlsKeyForCommand(m.id)}%`,
    category: '%ext.category%',
    ...(m.icon ? { icon: `$(${m.icon})` } : {})
  }));

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

  menus['commandPalette'] = manifests
    .filter(m => m.palette !== false)
    .map(m => ({ command: `${COMMAND_PREFIX}.${m.id}` }));

  return { commands, menus };
}

function buildDefaultNls(manifests, defaults) {
  const out = { ...defaults };
  for (const m of manifests) out[nlsKeyForCommand(m.id)] = m.title;
  return out;
}

function buildLocaleNls(localeData, defaults, manifests) {
  // Start from English defaults so VSCode can fall back per-key if a translation is missing.
  const out = { ...defaults };
  for (const m of manifests) out[nlsKeyForCommand(m.id)] = m.title;
  if (localeData.commands) {
    for (const [id, v] of Object.entries(localeData.commands)) out[nlsKeyForCommand(id)] = v;
  }
  // Generic block handling: any top-level key OTHER than `commands` and `runtime` is treated
  // as a prefix namespace. Members become `<block>.<key>`. So `ext.*`, `cfg.*`, etc. all flow.
  for (const [block, entries] of Object.entries(localeData)) {
    if (block === 'commands' || block === 'runtime') continue;
    if (!entries || typeof entries !== 'object') continue;
    for (const [k, v] of Object.entries(entries)) out[`${block}.${k}`] = v;
  }
  return out;
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

async function readRawOrNull(file) {
  try {
    return await fs.readFile(file, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function writeOrCheck(file, next, changes) {
  const current = await readRawOrNull(file);
  if (current === next) return;
  changes.push(path.relative(ROOT, file));
  if (!CHECK_MODE) {
    await ensureDir(path.dirname(file));
    await fs.writeFile(file, next);
  }
}

async function main() {
  const appDirs = await listAppDirs();
  const manifests = await Promise.all(appDirs.map(readManifest));
  const { commands, menus } = buildContributes(manifests);
  const defaults = await readJson(DEFAULTS_PATH);

  // package.json
  const pkgRaw = await fs.readFile(PKG_PATH, 'utf8');
  const pkg = JSON.parse(pkgRaw);
  pkg.contributes = { ...(pkg.contributes ?? {}), commands, menus };
  const nextPkg = JSON.stringify(pkg, null, 2) + '\n';

  // Default NLS
  const defaultNls = buildDefaultNls(manifests, defaults);
  const nextDefaultNls = JSON.stringify(defaultNls, null, 2) + '\n';

  // Per-locale NLS + l10n bundles
  const locales = await listLocales();
  const localeOutputs = [];
  for (const locale of locales) {
    const data = await readJson(path.join(I18N_DIR, `${locale}.json`));
    const nls = buildLocaleNls(data, defaults, manifests);
    localeOutputs.push({
      nlsFile: path.join(ROOT, `package.nls.${locale}.json`),
      nlsContent: JSON.stringify(nls, null, 2) + '\n',
      bundleFile: path.join(L10N_DIR, `bundle.l10n.${locale}.json`),
      bundleContent: JSON.stringify(data.runtime ?? {}, null, 2) + '\n'
    });
  }

  const changes = [];
  await writeOrCheck(PKG_PATH, nextPkg, changes);
  await writeOrCheck(path.join(ROOT, 'package.nls.json'), nextDefaultNls, changes);
  for (const o of localeOutputs) {
    await writeOrCheck(o.nlsFile, o.nlsContent, changes);
    await writeOrCheck(o.bundleFile, o.bundleContent, changes);
  }

  if (CHECK_MODE) {
    if (changes.length) {
      console.error('Out of sync — run `npm run sync`:');
      for (const c of changes) console.error(`  - ${c}`);
      process.exit(1);
    }
    console.log('package.json, package.nls.*.json, and l10n/bundle.l10n.*.json are in sync.');
    return;
  }

  console.log(
    `Synced ${manifests.length} apps -> ${commands.length} commands, ${Object.keys(menus).length} menus, ${locales.length} locales (${locales.join(', ') || 'default only'}).`
  );
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
