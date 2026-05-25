// Bundles src/extension.ts (+ all imports) → dist/extension.js as CommonJS.
// All deps inlined except 'vscode' (provided by host). vsce packages with
// --no-dependencies, so every runtime import MUST land in this bundle.
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
  legalComments: 'none',
  // Prefer ESM entries — UMD wrappers use dynamic require() which esbuild can't trace.
  mainFields: ['module', 'main']
};

if (watch) {
  const ctx = await (await import('esbuild')).context(opts);
  await ctx.watch();
  console.log('esbuild watching…');
} else {
  await build(opts);
}
