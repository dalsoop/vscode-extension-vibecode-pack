#!/usr/bin/env node
import { mkdir, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const srcDir = resolve(root, 'node_modules/@vscode/codicons/dist');
const dstDir = resolve(root, 'dist/codicons');

const files = ['codicon.css', 'codicon.ttf'];

if (!existsSync(srcDir)) {
  console.error('copy-codicons: source dir not found —', srcDir);
  console.error('  did you run `npm install`?');
  process.exit(1);
}

await mkdir(dstDir, { recursive: true });
for (const f of files) {
  await copyFile(resolve(srcDir, f), resolve(dstDir, f));
  console.log('copy-codicons: copied', f);
}
console.log('copy-codicons: done →', dstDir);
