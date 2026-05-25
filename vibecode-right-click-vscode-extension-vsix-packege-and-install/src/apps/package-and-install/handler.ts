import * as vscode from 'vscode';
import * as path from 'path';
import { promises as fsp } from 'fs';

interface ExtensionPackageJson {
  name?: string;
  version?: string;
  engines?: { vscode?: string };
  scripts?: Record<string, string>;
}

export async function handler(arg: vscode.Uri | undefined): Promise<void> {
  const folderUri = arg;
  if (!folderUri) {
    vscode.window.showWarningMessage(vscode.l10n.t('No folder selected.'));
    return;
  }

  const folderPath = folderUri.fsPath;
  const folderName = path.basename(folderPath);
  const pkgPath = path.join(folderPath, 'package.json');

  let pkg: ExtensionPackageJson;
  try {
    pkg = JSON.parse(await fsp.readFile(pkgPath, 'utf8')) as ExtensionPackageJson;
  } catch {
    vscode.window.showWarningMessage(vscode.l10n.t('No package.json found in {0}.', folderName));
    return;
  }

  if (!pkg.engines?.vscode) {
    vscode.window.showWarningMessage(
      vscode.l10n.t('{0} is not a VSCode extension (no engines.vscode in package.json).', folderName)
    );
    return;
  }

  const packageCmd = pkg.scripts?.package
    ? 'npm run package'
    : 'npx --yes @vscode/vsce@latest package --no-dependencies --allow-missing-repository --skip-license';

  const vsixName = `${pkg.name ?? folderName}-${pkg.version ?? '0.0.0'}.vsix`;

  const term = vscode.window.createTerminal({ name: `📦 ${folderName}`, cwd: folderPath });
  term.show();
  term.sendText(
    `npm install --silent && ${packageCmd} && code --install-extension ${quoteForShell(vsixName)}`
  );
}

function quoteForShell(s: string): string {
  return `'${s.replace(/'/g, "'\\''")}'`;
}
