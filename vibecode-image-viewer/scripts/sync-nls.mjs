#!/usr/bin/env node

import { promises as fs } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const I18N_DIR = path.join(ROOT, 'i18n');
const L10N_DIR = path.join(ROOT, 'l10n');
const DEFAULTS_PATH = path.join(__dirname, 'nls-defaults.json');

const CHECK_MODE = process.argv.includes('--check');

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
  const defaults = await readJson(DEFAULTS_PATH);
  const locales = await listLocales();

  const changes = [];

  const nextDefault = JSON.stringify(defaults, null, 2) + '\n';
  await writeOrCheck(path.join(ROOT, 'package.nls.json'), nextDefault, changes);

  for (const locale of locales) {
    const data = await readJson(path.join(I18N_DIR, `${locale}.json`));
    const nls = { ...defaults, ...(data.nls ?? {}) };
    const nlsContent = JSON.stringify(nls, null, 2) + '\n';
    const bundleContent = JSON.stringify(data.runtime ?? {}, null, 2) + '\n';

    await writeOrCheck(path.join(ROOT, `package.nls.${locale}.json`), nlsContent, changes);
    await writeOrCheck(path.join(L10N_DIR, `bundle.l10n.${locale}.json`), bundleContent, changes);
  }

  if (CHECK_MODE) {
    if (changes.length) {
      console.error('Out of sync — run `npm run sync`:');
      for (const c of changes) console.error(`  - ${c}`);
      process.exit(1);
    }
    console.log('NLS bundles are in sync.');
    return;
  }

  console.log(`Synced NLS — default + ${locales.length} locales (${locales.join(', ') || 'none'}).`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
