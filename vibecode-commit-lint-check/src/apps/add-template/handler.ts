import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import {
  TEMPLATE_FILENAME,
  USER_TEMPLATES_DIRNAME,
  type CommitLintTemplate
} from '../_types';

export async function handler(arg: vscode.Uri | undefined): Promise<void> {
  const targetFolder = await resolveFolder(arg);
  if (!targetFolder) {
    vscode.window.showWarningMessage(vscode.l10n.t('No folder selected.'));
    return;
  }

  const name = await vscode.window.showInputBox({
    title: vscode.l10n.t('New commit-lint template name'),
    prompt: vscode.l10n.t('Will be appended after the timestamp prefix (yymmddhhmmss-<name>).'),
    value: path.basename(targetFolder),
    validateInput: v => {
      if (!v || !v.trim()) return vscode.l10n.t('Name is required.');
      if (!/^[a-zA-Z0-9._-]+$/.test(v)) {
        return vscode.l10n.t('Use only letters, digits, dot, underscore, or hyphen.');
      }
      return null;
    }
  });
  if (!name) return;

  const folderName = `${timestamp()}-${name.trim()}`;
  const entryDir = path.join(targetFolder, USER_TEMPLATES_DIRNAME, folderName);
  const jsonPath = path.join(entryDir, TEMPLATE_FILENAME);

  if (fs.existsSync(jsonPath)) {
    vscode.window.showWarningMessage(vscode.l10n.t('Template already exists: {0}', jsonPath));
    return;
  }

  const template: CommitLintTemplate = {
    title: name.trim(),
    description: 'Custom commitlint template.',
    files: [
      {
        path: 'commitlint.config.js',
        content:
          "module.exports = {\n  extends: ['@commitlint/config-conventional']\n};\n"
      }
    ],
    postInstall: [
      'npm install --save-dev @commitlint/cli @commitlint/config-conventional'
    ]
  };

  await fs.promises.mkdir(entryDir, { recursive: true });
  await fs.promises.writeFile(jsonPath, JSON.stringify(template, null, 2) + '\n', 'utf8');

  const doc = await vscode.workspace.openTextDocument(jsonPath);
  await vscode.window.showTextDocument(doc);
  vscode.window.setStatusBarMessage(vscode.l10n.t('Created: {0}', folderName), 3000);
}

async function resolveFolder(arg: vscode.Uri | undefined): Promise<string | undefined> {
  if (arg) {
    try {
      const stat = await fs.promises.stat(arg.fsPath);
      return stat.isDirectory() ? arg.fsPath : path.dirname(arg.fsPath);
    } catch {
      // fall through to workspace folder
    }
  }
  const ws = vscode.workspace.workspaceFolders?.[0];
  return ws?.uri.fsPath;
}

function timestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    pad(d.getFullYear() % 100) +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}
