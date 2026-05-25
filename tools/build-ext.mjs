#!/usr/bin/env node
// Shared esbuild driver for vibecode-* extensions.
//
// Bundles <cwd>/src/extension.ts → <cwd>/dist/extension.js as CommonJS, inlining
// every runtime dep except `vscode` (provided by the host). `vsce package` runs
// with --no-dependencies, so anything not in this bundle is missing at load time.
//
// Resolves esbuild from the caller's node_modules so each extension keeps its
// own pinned version; this file (tools/) has no node_modules of its own.
//
// Usage (from an extension folder):
//   node ../tools/build-ext.mjs [--production] [--watch] [--main-fields <list>]

import { createRequire } from 'module';
import { pathToFileURL } from 'url';
import path from 'path';

const argv = process.argv.slice(2);
const production = argv.includes('--production');
const watch = argv.includes('--watch');

const mainFieldsIdx = argv.indexOf('--main-fields');
const mainFields =
  mainFieldsIdx >= 0 && argv[mainFieldsIdx + 1]
    ? argv[mainFieldsIdx + 1].split(',')
    : undefined;

const callerRequire = createRequire(path.join(process.cwd(), 'package.json'));
const esbuildEntry = callerRequire.resolve('esbuild');
const esbuild = await import(pathToFileURL(esbuildEntry).href);

const opts = {
  entryPoints: ['src/extension.ts'],
  bundle: true,
  outfile: 'dist/extension.js',
  external: ['vscode'],
  format: 'cjs',
  platform: 'node',
  target: 'node20',
  sourcemap: !production,
  minify: production,
  logLevel: 'info',
  legalComments: 'none',
  ...(mainFields ? { mainFields } : {}),
};

if (watch) {
  const ctx = await esbuild.context(opts);
  await ctx.watch();
  console.log('esbuild watching…');
} else {
  await esbuild.build(opts);
}
