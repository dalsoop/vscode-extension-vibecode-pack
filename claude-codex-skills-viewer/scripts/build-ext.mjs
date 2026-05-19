// Bundles src/extension.ts (+ all imports) → dist/extension.js as CommonJS.
// All deps inlined except 'vscode' (provided by host).
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
  // Drop debug-only fs-watcher noise if any; nothing custom for now.
  legalComments: 'none'
};

if (watch) {
  const ctx = await (await import('esbuild')).context(opts);
  await ctx.watch();
  console.log('esbuild watching…');
} else {
  await build(opts);
}
