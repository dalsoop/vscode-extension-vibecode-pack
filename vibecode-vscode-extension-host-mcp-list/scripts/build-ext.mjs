// Bundles src/extension.ts (+ all imports) → dist/extension.js as CommonJS.
// All deps inlined except 'vscode' (provided by host).
// Also emits dist/parse.js so the unit tests can require the parser directly
// (the tests run against jsonc-parser from node_modules).
import { build } from 'esbuild';

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

const extOpts = {
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
  // jsonc-parser ships UMD as `main`; UMD's dynamic require() can't be statically
  // analyzed by esbuild, so prefer its ESM entry which has plain static imports.
  mainFields: ['module', 'main']
};

const testOpts = {
  entryPoints: ['src/parse.ts'],
  bundle: true,
  outfile: 'dist/parse.js',
  external: ['jsonc-parser'],
  format: 'cjs',
  platform: 'node',
  target: 'node20',
  sourcemap: !production,
  logLevel: 'warning'
};

if (watch) {
  const esbuild = await import('esbuild');
  const ctxExt = await esbuild.context(extOpts);
  const ctxTest = await esbuild.context(testOpts);
  await Promise.all([ctxExt.watch(), ctxTest.watch()]);
  console.log('esbuild watching…');
} else {
  await Promise.all([build(extOpts), build(testOpts)]);
}
