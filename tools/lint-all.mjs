#!/usr/bin/env node
// Walk every vibecode-* extension and run `npm run lint`. Aggregate results.
// Exit non-zero if any extension's lint fails (i.e., new violations beyond
// the baseline in eslint-suppressions.json).
//
// Usage:
//   node tools/lint-all.mjs            # run lint in each extension
//   node tools/lint-all.mjs --summary  # print a debt summary table from suppression files

import { promises as fs } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SUMMARY = process.argv.includes('--summary');

async function listExtensions() {
  const entries = await fs.readdir(ROOT, { withFileTypes: true });
  const out = [];
  for (const e of entries) {
    if (!e.isDirectory() || !e.name.startsWith('vibecode-')) continue;
    const pkg = path.join(ROOT, e.name, 'package.json');
    try { await fs.access(pkg); } catch { continue; }
    out.push(e.name);
  }
  return out.sort();
}

async function readSuppressions(ext) {
  const file = path.join(ROOT, ext, 'eslint-suppressions.json');
  try {
    const text = await fs.readFile(file, 'utf8');
    return JSON.parse(text);
  } catch { return null; }
}

function tallyByRule(suppressions) {
  const tally = {};
  for (const file of Object.values(suppressions ?? {})) {
    for (const [rule, info] of Object.entries(file)) {
      tally[rule] = (tally[rule] ?? 0) + (info.count ?? 0);
    }
  }
  return tally;
}

function runLint(cwd) {
  return new Promise((resolve) => {
    const proc = spawn('npm', ['run', 'lint'], { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    proc.stdout.on('data', d => { out += d; });
    proc.stderr.on('data', d => { err += d; });
    proc.on('close', code => resolve({ code, out, err }));
  });
}

async function summary() {
  const exts = await listExtensions();
  console.log('\nLint debt summary (eslint-suppressions.json baselines):\n');
  console.log('Extension                                                  Total  Top rules');
  console.log('─'.repeat(95));
  let grandTotal = 0;
  for (const ext of exts) {
    const sup = await readSuppressions(ext);
    if (!sup) {
      console.log(`  ✓  ${ext.padEnd(58)}    0`);
      continue;
    }
    const tally = tallyByRule(sup);
    const total = Object.values(tally).reduce((a, b) => a + b, 0);
    grandTotal += total;
    const top = Object.entries(tally).sort((a, b) => b[1] - a[1]).slice(0, 3)
      .map(([r, c]) => `${r}(${c})`).join(', ');
    console.log(`  •  ${ext.padEnd(58)} ${String(total).padStart(4)}  ${top}`);
  }
  console.log('─'.repeat(95));
  console.log(`  TOTAL DEBT: ${grandTotal} suppressed errors across ${exts.length} extensions\n`);
  console.log('To clear debt: fix violations in source, then re-run `node tools/sync-eslint.mjs`');
  console.log('and `npx eslint . --suppress-all --prune-suppressions` inside each extension.\n');
}

async function lintAll() {
  const exts = await listExtensions();
  const failures = [];
  console.log('\nRunning lint in each extension…\n');
  for (const ext of exts) {
    process.stdout.write(`  ${ext.padEnd(58)} `);
    const { code, out, err } = await runLint(path.join(ROOT, ext));
    if (code === 0) {
      const summary = (out.match(/(\d+) problems? \(\d+ errors?, (\d+) warnings?\)/) ?? [])[0];
      process.stdout.write(summary ? `⚠ ${summary}\n` : '✓ clean\n');
    } else {
      process.stdout.write('✗ FAIL\n');
      failures.push({ ext, out, err });
    }
  }
  if (failures.length > 0) {
    console.log(`\n${failures.length} extension(s) failed lint:\n`);
    for (const f of failures) {
      console.log(`\n=== ${f.ext} ===\n${f.out}`);
    }
    process.exit(1);
  }
  console.log(`\n✓ All ${exts.length} extensions pass lint (warnings allowed).`);
}

if (SUMMARY) {
  await summary();
} else {
  await lintAll();
}
