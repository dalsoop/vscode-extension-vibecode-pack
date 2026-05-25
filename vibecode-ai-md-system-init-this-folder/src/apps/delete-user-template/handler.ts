import * as vscode from 'vscode';
import * as fs from 'fs';

/**
 * Arg is the TreeNode (a TemplateNode of origin=user). Confirms then removes
 * the folder under ~/.vibecode-ai-md-system/templates/<name>/.
 */
export async function handler(node: unknown): Promise<void> {
  const template = extractUserTemplate(node);
  if (!template) {
    vscode.window.showWarningMessage(
      vscode.l10n.t('Right-click a user template (👤 group) to delete it.')
    );
    return;
  }
  const choice = await vscode.window.showWarningMessage(
    vscode.l10n.t('Delete user template "{0}"?', template.name),
    {
      modal: true,
      detail: vscode.l10n.t('This removes {0} permanently. Bundled templates are unaffected.', template.rootPath)
    },
    vscode.l10n.t('Delete')
  );
  if (!choice) return;
  await fs.promises.rm(template.rootPath, { recursive: true, force: true });
  vscode.window.showInformationMessage(
    vscode.l10n.t('Deleted user template "{0}".', template.name)
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
