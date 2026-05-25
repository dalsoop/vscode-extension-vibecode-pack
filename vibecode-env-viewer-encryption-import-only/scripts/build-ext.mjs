// Bundles src/extension.ts (+ all transitive imports) → dist/extension.js as
// a single CommonJS file. Mirrors vibecode-skills-viewer/scripts/build-ext.mjs.
//
// Why bundling: VSCode extensions ship as .vsix archives, and `vsce` excludes
// node_modules by default. Runtime deps like `eciesjs` would be missing at
// load time. Inlining everything except `vscode` (which the host provides)
// makes the .vsix self-contained.

import { build } from 'esbuild';

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

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
  legalComments: 'none'
};

if (watch) {
  const ctx = await (await import('esbuild')).context(opts);
  await ctx.watch();
  console.log('esbuild watching…');
} else {
  await build(opts);
}
