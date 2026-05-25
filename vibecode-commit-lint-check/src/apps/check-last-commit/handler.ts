import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export async function handler(arg: vscode.Uri | undefined): Promise<void> {
  const cwd = await resolveCwd(arg);
  if (!cwd) {
    vscode.window.showWarningMessage(vscode.l10n.t('No workspace folder open.'));
    return;
  }

  if (!hasGitDir(cwd)) {
    vscode.window.showWarningMessage(
      vscode.l10n.t('Not a git repository: {0}', cwd)
    );
    return;
  }

  if (!hasCommitlintConfig(cwd)) {
    const choice = await vscode.window.showWarningMessage(
      vscode.l10n.t(
        'No commitlint.config.* found in {0}. Scaffold one from a template first?',
        cwd
      ),
      vscode.l10n.t('Init From Template'),
      vscode.l10n.t('Run anyway')
    );
    if (choice === vscode.l10n.t('Init From Template')) {
      await vscode.commands.executeCommand(
        'vibecodeCommitLint.initFromTemplate',
        vscode.Uri.file(cwd)
      );
      return;
    }
    if (choice !== vscode.l10n.t('Run anyway')) return;
  }

  const term = findOrCreateTerminal('commitlint: last commit', cwd);
  term.show(true);
  term.sendText('npx --yes commitlint --from HEAD~1 --to HEAD --verbose', true);
}

function findOrCreateTerminal(name: string, cwd: string): vscode.Terminal {
  const existing = vscode.window.terminals.find(t => t.name === name);
  if (existing && existing.exitStatus === undefined) return existing;
  return vscode.window.createTerminal({ name, cwd });
}

async function resolveCwd(arg: vscode.Uri | undefined): Promise<string | undefined> {
  if (arg) {
    try {
      const stat = await fs.promises.stat(arg.fsPath);
      return stat.isDirectory() ? arg.fsPath : path.dirname(arg.fsPath);
    } catch {
      // fall through
    }
  }
  const ws = vscode.workspace.workspaceFolders?.[0];
  return ws?.uri.fsPath;
}

function hasGitDir(cwd: string): boolean {
  return fs.existsSync(path.join(cwd, '.git'));
}

function hasCommitlintConfig(cwd: string): boolean {
  return [
    'commitlint.config.js',
    'commitlint.config.cjs',
    'commitlint.config.mjs',
    'commitlint.config.ts',
    '.commitlintrc',
    '.commitlintrc.json',
    '.commitlintrc.yml',
    '.commitlintrc.yaml',
    '.commitlintrc.js',
    '.commitlintrc.cjs'
  ].some(name => fs.existsSync(path.join(cwd, name)));
}
