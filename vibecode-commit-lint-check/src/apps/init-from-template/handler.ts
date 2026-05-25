import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import {
  applyTemplateFiles,
  readBundledTemplates,
  readUserTemplates,
  type TemplateEntry
} from '../../lib/templateUtils';
import type { CommitLintTemplate } from '../_types';

interface TemplatePick extends vscode.QuickPickItem {
  entry: TemplateEntry;
}

export async function handler(arg: vscode.Uri | undefined): Promise<void> {
  const targetFolder = await resolveFolder(arg);
  if (!targetFolder) {
    vscode.window.showWarningMessage(vscode.l10n.t('No folder selected.'));
    return;
  }

  const bundled = await readBundledTemplates();
  const user = await readUserTemplates(targetFolder);
  const all = [...bundled, ...user];

  if (all.length === 0) {
    vscode.window.showWarningMessage(vscode.l10n.t('No commit-lint templates found.'));
    return;
  }

  const picks: TemplatePick[] = all.map(entry => ({
    label: entry.name,
    description: entry.source === 'user' ? vscode.l10n.t('user') : vscode.l10n.t('bundled'),
    detail: entry.template.description,
    entry
  }));

  const selected = await vscode.window.showQuickPick(picks, {
    title: vscode.l10n.t('Pick a commitlint template to scaffold'),
    placeHolder: vscode.l10n.t('Files will be written into: {0}', targetFolder),
    matchOnDescription: true,
    matchOnDetail: true
  });
  if (!selected) return;

  await applyAndReport(targetFolder, selected.entry.template);
}

export async function applyAndReport(
  targetFolder: string,
  template: CommitLintTemplate
): Promise<void> {
  const { written, skipped } = await applyTemplateFiles(targetFolder, template);

  if (skipped.length) {
    vscode.window.showWarningMessage(
      vscode.l10n.t('Skipped (already exists): {0}', skipped.join(', '))
    );
  }

  if (written.length === 0 && skipped.length === 0) {
    vscode.window.showWarningMessage(vscode.l10n.t('Template has no files declared.'));
    return;
  }

  const configFile = written.find(p => /commitlint\.config\.(c|m)?js$/i.test(p));
  if (configFile) {
    const doc = await vscode.workspace.openTextDocument(path.join(targetFolder, configFile));
    await vscode.window.showTextDocument(doc);
  }

  const post = template.postInstall ?? [];
  if (post.length) {
    const choice = await vscode.window.showInformationMessage(
      vscode.l10n.t(
        'Wrote {0} file(s) from "{1}". Run {2} post-install command(s) in a terminal?',
        String(written.length),
        template.title,
        String(post.length)
      ),
      { modal: true },
      vscode.l10n.t('Run in terminal'),
      vscode.l10n.t('Skip')
    );
    if (choice === vscode.l10n.t('Run in terminal')) {
      runInTerminal(targetFolder, template.title, post);
    }
  } else {
    vscode.window.setStatusBarMessage(
      vscode.l10n.t('Scaffolded {0} file(s) from "{1}"', String(written.length), template.title),
      4000
    );
  }
}

async function resolveFolder(arg: vscode.Uri | undefined): Promise<string | undefined> {
  if (!arg) {
    const ws = vscode.workspace.workspaceFolders?.[0];
    return ws?.uri.fsPath;
  }
  try {
    const stat = await fs.promises.stat(arg.fsPath);
    return stat.isDirectory() ? arg.fsPath : path.dirname(arg.fsPath);
  } catch {
    return undefined;
  }
}

function runInTerminal(cwd: string, label: string, commands: string[]): void {
  const term = vscode.window.createTerminal({ name: `commitlint: ${label}`, cwd });
  term.show(true);
  for (const cmd of commands) term.sendText(cmd, true);
}
