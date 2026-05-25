import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { validateCommitMessage, formatValidationResult } from '../../lint/validator';
import { getOutputChannel } from '../../checks/outputChannel';

const execFileAsync = promisify(execFile);

export async function handler(arg: vscode.Uri | undefined): Promise<void> {
  const cwd = await resolveCwd(arg);
  if (!cwd) {
    vscode.window.showWarningMessage(vscode.l10n.t('No workspace folder open.'));
    return;
  }

  if (!hasGitDir(cwd)) {
    vscode.window.showWarningMessage(vscode.l10n.t('Not a git repository: {0}', cwd));
    return;
  }

  const useExternal = hasCommitlintConfig(cwd) && getUseExternalSetting();
  if (useExternal) {
    runExternalCommitlint(cwd);
    return;
  }

  await runBuiltinValidator(cwd);
}

async function runBuiltinValidator(cwd: string): Promise<void> {
  const channel = getOutputChannel();
  channel.show(true);
  channel.appendLine(`\n=== built-in commit lint @ ${new Date().toISOString()} ===`);
  channel.appendLine(`cwd: ${cwd}`);

  let message: string;
  try {
    const { stdout } = await execFileAsync('git', ['log', '-1', '--pretty=%B'], { cwd });
    message = stdout.replace(/\n+$/, '');
  } catch (err) {
    channel.appendLine(`git log failed: ${String(err)}`);
    vscode.window.showErrorMessage(vscode.l10n.t('Failed to read HEAD commit: {0}', String(err)));
    return;
  }

  const result = validateCommitMessage(message);
  const header = message.split('\n')[0] ?? '';
  channel.appendLine(formatValidationResult(header, result));

  if (result.ok) {
    vscode.window.setStatusBarMessage(vscode.l10n.t('Commit lint: passed'), 4000);
  } else {
    const errCount = result.issues.filter(i => i.severity === 'error').length;
    vscode.window.showWarningMessage(
      vscode.l10n.t('Commit lint: {0} issue(s) — see output', String(errCount))
    );
  }
}

function runExternalCommitlint(cwd: string): void {
  const term = findOrCreateTerminal('commitlint: last commit', cwd);
  term.show(true);
  term.sendText(resolveExternalCommand(), true);
}

function resolveExternalCommand(): string {
  const configured = vscode.workspace
    .getConfiguration('vibecodeCommitLint')
    .get<string>('checkLastCommit.command');
  const trimmed = configured?.trim();
  return trimmed && trimmed.length > 0
    ? trimmed
    : 'npx --yes commitlint --from HEAD~1 --to HEAD --verbose';
}

function getUseExternalSetting(): boolean {
  const cfg = vscode.workspace.getConfiguration('vibecodeCommitLint');
  const value = cfg.get<boolean>('checkLastCommit.preferExternal');
  return value === true;
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
