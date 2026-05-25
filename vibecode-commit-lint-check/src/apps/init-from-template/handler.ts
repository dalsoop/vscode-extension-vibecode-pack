import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import {
  TEMPLATE_FILENAME,
  USER_TEMPLATES_DIRNAME,
  type CommitLintTemplate,
  type TemplateFile
} from '../_types';

interface TemplatePick extends vscode.QuickPickItem {
  source: 'bundled' | 'user';
  templatePath: string;
  template: CommitLintTemplate;
}

export async function handler(arg: vscode.Uri | undefined): Promise<void> {
  const targetFolder = await resolveFolder(arg);
  if (!targetFolder) {
    vscode.window.showWarningMessage(vscode.l10n.t('No folder selected.'));
    return;
  }

  const picks = await collectTemplates(targetFolder);
  if (picks.length === 0) {
    vscode.window.showWarningMessage(vscode.l10n.t('No commit-lint templates found.'));
    return;
  }

  const selected = await vscode.window.showQuickPick(picks, {
    title: vscode.l10n.t('Pick a commitlint template to scaffold'),
    placeHolder: vscode.l10n.t('Files will be written into: {0}', targetFolder),
    matchOnDescription: true,
    matchOnDetail: true
  });
  if (!selected) return;

  const written: string[] = [];
  const skipped: string[] = [];
  for (const file of selected.template.files) {
    const result = await writeTemplateFile(targetFolder, file);
    if (result === 'written') written.push(file.path);
    else if (result === 'skipped') skipped.push(file.path);
  }

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

  const post = selected.template.postInstall ?? [];
  if (post.length) {
    const choice = await vscode.window.showInformationMessage(
      vscode.l10n.t(
        'Wrote {0} file(s) from "{1}". Run {2} post-install command(s) in a terminal?',
        String(written.length),
        selected.template.title,
        String(post.length)
      ),
      { modal: true },
      vscode.l10n.t('Run in terminal'),
      vscode.l10n.t('Skip')
    );
    if (choice === vscode.l10n.t('Run in terminal')) {
      runInTerminal(targetFolder, selected.template.title, post);
    }
  } else {
    vscode.window.setStatusBarMessage(
      vscode.l10n.t('Scaffolded {0} file(s) from "{1}"', String(written.length), selected.template.title),
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

async function collectTemplates(workspaceFolder: string): Promise<TemplatePick[]> {
  const bundledRoot = path.join(extensionRoot(), 'templates');
  const userRoot = path.join(workspaceFolder, USER_TEMPLATES_DIRNAME);

  const bundled = await readTemplatesIn(bundledRoot, 'bundled');
  const user = await readTemplatesIn(userRoot, 'user');

  const items: TemplatePick[] = [];
  for (const t of bundled) items.push(toPick(t.template, t.dir, 'bundled'));
  for (const t of user) items.push(toPick(t.template, t.dir, 'user'));
  return items;
}

function toPick(
  template: CommitLintTemplate,
  dir: string,
  source: 'bundled' | 'user'
): TemplatePick {
  return {
    label: template.title || path.basename(dir),
    description: source === 'user' ? vscode.l10n.t('user') : vscode.l10n.t('bundled'),
    detail: template.description,
    source,
    templatePath: dir,
    template
  };
}

async function readTemplatesIn(
  root: string,
  _source: 'bundled' | 'user'
): Promise<{ dir: string; template: CommitLintTemplate }[]> {
  const out: { dir: string; template: CommitLintTemplate }[] = [];
  let entries: fs.Dirent[];
  try {
    entries = await fs.promises.readdir(root, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isDirectory()) continue;
    const dir = path.join(root, entry.name);
    const file = path.join(dir, TEMPLATE_FILENAME);
    try {
      const raw = await fs.promises.readFile(file, 'utf8');
      const parsed = JSON.parse(raw) as CommitLintTemplate;
      if (Array.isArray(parsed.files)) out.push({ dir, template: parsed });
    } catch {
      // ignore malformed entries
    }
  }
  return out;
}

async function writeTemplateFile(
  targetFolder: string,
  file: TemplateFile
): Promise<'written' | 'skipped'> {
  const fullPath = path.join(targetFolder, file.path);
  if (fs.existsSync(fullPath) && !file.overwrite) return 'skipped';
  await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.promises.writeFile(fullPath, file.content, 'utf8');
  return 'written';
}

function runInTerminal(cwd: string, label: string, commands: string[]): void {
  const term = vscode.window.createTerminal({ name: `commitlint: ${label}`, cwd });
  term.show(true);
  for (const cmd of commands) term.sendText(cmd, true);
}

function extensionRoot(): string {
  // dist/extension.js → up one dir to extension root
  return path.resolve(__dirname, '..');
}
