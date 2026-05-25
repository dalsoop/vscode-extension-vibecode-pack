import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export async function handler(node: unknown): Promise<void> {
  const template = extractUserTemplate(node);
  if (!template) {
    vscode.window.showWarningMessage(
      vscode.l10n.t('Right-click a user template (👤 group) to rename it.')
    );
    return;
  }
  const newName = await vscode.window.showInputBox({
    title: vscode.l10n.t('Rename user template'),
    value: template.name,
    validateInput: v => {
      if (!v || !v.trim()) return vscode.l10n.t('Name is required.');
      if (!/^[A-Za-z0-9._-]+$/.test(v)) {
        return vscode.l10n.t('Use only letters, digits, dot, underscore, or hyphen.');
      }
      return null;
    }
  });
  if (!newName || newName.trim() === template.name) return;

  const newPath = path.join(path.dirname(template.rootPath), newName.trim());
  if (fs.existsSync(newPath)) {
    vscode.window.showErrorMessage(
      vscode.l10n.t('A template named "{0}" already exists.', newName.trim())
    );
    return;
  }
  await fs.promises.rename(template.rootPath, newPath);
  vscode.window.showInformationMessage(
    vscode.l10n.t('Renamed "{0}" → "{1}".', template.name, newName.trim())
  );
  await vscode.commands.executeCommand('vibecodeAiMdSystem.refreshTemplates');
}

function extractUserTemplate(
  node: unknown
): { name: string; rootPath: string } | undefined {
  if (!node || typeof node !== 'object') return undefined;
  const n = node as { kind?: string; origin?: string; name?: string; rootUri?: vscode.Uri };
  if (n.kind !== 'template' || n.origin !== 'user' || !n.name || !n.rootUri) return undefined;
  return { name: n.name, rootPath: n.rootUri.fsPath };
}
