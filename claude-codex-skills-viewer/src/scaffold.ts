import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as state from './state';

export function sanitizeName(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const TEMPLATE = ({ name, description, whenToUse }: { name: string; description: string; whenToUse: string }) => `---
name: ${name}
description: ${description}
---

# ${name}

## When to use

${whenToUse}

## How to use

1. Step one — describe the trigger and first action.
2. Step two — what to do next.
3. Step three — verify and report.

## Examples

\`\`\`
Example invocation or output here.
\`\`\`

## Notes

- Add constraints or gotchas here.
`;

interface ScopePick {
  label: string;
  target: string;
}

async function pickScope(): Promise<ScopePick | undefined> {
  return vscode.window.showQuickPick<ScopePick>(
    [
      { label: 'Global (~/.claude/skills)', target: 'claude-global' },
      { label: 'Global (~/.codex/skills)', target: 'codex-global' },
      { label: 'Workspace (.claude/skills)', target: 'claude-ws' },
      { label: 'Workspace (.codex/skills)', target: 'codex-ws' },
      { label: 'Workspace (.github/skills, Copilot)', target: 'copilot-ws' }
    ],
    { placeHolder: 'Where should the skill live?' }
  );
}

function resolveTargetDir(target: string): string | null {
  const home = os.homedir();
  const ws = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0];
  const wsPath = ws ? ws.uri.fsPath : null;
  switch (target) {
    case 'claude-global':
      return path.join(home, '.claude', 'skills');
    case 'codex-global':
      return path.join(home, '.codex', 'skills');
    case 'claude-ws':
      return wsPath && path.join(wsPath, '.claude', 'skills');
    case 'codex-ws':
      return wsPath && path.join(wsPath, '.codex', 'skills');
    case 'copilot-ws':
      return wsPath && path.join(wsPath, '.github', 'skills');
  }
  return null;
}

export async function runWizard(): Promise<string | undefined> {
  const scope = await pickScope();
  if (!scope) return;
  const targetDir = resolveTargetDir(scope.target);
  if (!targetDir) {
    vscode.window.showErrorMessage('No workspace open for that target.');
    return;
  }
  const rawName = await vscode.window.showInputBox({ prompt: 'Skill name', placeHolder: 'my-cool-skill' });
  if (!rawName) return;
  const name = sanitizeName(rawName);
  if (!name) return;
  const description = await vscode.window.showInputBox({ prompt: 'Short description (1 sentence)' });
  if (description === undefined) return;
  const whenToUse = await vscode.window.showInputBox({
    prompt: '"When to use" — situational trigger',
    value: 'When the user requests ...'
  });
  if (whenToUse === undefined) return;

  const dir = path.join(targetDir, name);
  if (fs.existsSync(dir)) {
    vscode.window.showErrorMessage(`Skill already exists: ${dir}`);
    return;
  }
  fs.mkdirSync(dir, { recursive: true });
  const md = TEMPLATE({ name, description, whenToUse });
  const mdPath = path.join(dir, 'SKILL.md');
  fs.writeFileSync(mdPath, md, 'utf8');
  await state.markInstalled(dir);
  const doc = await vscode.workspace.openTextDocument(mdPath);
  await vscode.window.showTextDocument(doc);
  vscode.window.showInformationMessage(`Skill "${name}" created.`);
  return dir;
}
