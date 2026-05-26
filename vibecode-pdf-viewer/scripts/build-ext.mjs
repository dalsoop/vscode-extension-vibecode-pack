import { build, context } from 'esbuild';
import { copyFile, mkdir } from 'fs/promises';
import { createRequire } from 'module';
import path from 'path';

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

const common = {
  bundle: true,
  sourcemap: !production,
  minify: production,
  logLevel: 'info',
  legalComments: 'none',
  mainFields: ['module', 'main']
};

const hostOpts = {
  ...common,
  entryPoints: ['src/extension.ts'],
  outfile: 'dist/extension.js',
  external: ['vscode'],
  format: 'cjs',
  platform: 'node',
  target: 'node20'
};

const webviewOpts = {
  ...common,
  entryPoints: ['src/webview/main.ts'],
  outfile: 'dist/webview.js',
  format: 'iife',
  platform: 'browser',
  target: 'es2020'
};

async function copyWorker() {
  const require = createRequire(import.meta.url);
  const pkgPath = path.dirname(require.resolve('pdfjs-dist/package.json'));
  const src = path.join(pkgPath, 'build', 'pdf.worker.mjs');
  await mkdir('dist', { recursive: true });
  await copyFile(src, 'dist/pdf.worker.mjs');
  console.log('Copied pdf.worker.mjs');
}

if (watch) {
  const hostCtx = await context(hostOpts);
  const webviewCtx = await context(webviewOpts);
  await hostCtx.watch();
  await webviewCtx.watch();
  await copyWorker();
  console.log('esbuild watching host + webview…');
} else {
  await build(hostOpts);
  await build(webviewOpts);
  await copyWorker();
}
