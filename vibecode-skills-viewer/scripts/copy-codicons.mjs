// Copies @vscode/codicons CSS + font into dist/ so the webview can load them
// as resources (node_modules is excluded from the packaged .vsix).
import { copyFileSync, mkdirSync } from 'node:fs';
const dest = 'dist/webview/codicons';
mkdirSync(dest, { recursive: true });
for (const f of ['codicon.css', 'codicon.ttf']) {
  copyFileSync(`node_modules/@vscode/codicons/dist/${f}`, `${dest}/${f}`);
}
console.log('codicons copied →', dest);
