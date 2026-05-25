import * as vscode from 'vscode';

const EXTENSION_ID = 'dalsoop.vibecode-ai-md-system-init-this-folder';
const TEMPLATES_SUBDIR = 'templates';

/**
 * Reveal the extension's bundled `templates/` folder — the SSOT for template recipes.
 * Uses `revealFileInOS` so it works regardless of whether the templates path is inside
 * the current workspace (dev mode) or under ~/.vscode/extensions/ (end-user install).
 */
export async function handler(): Promise<void> {
  const ext = vscode.extensions.getExtension(EXTENSION_ID);
  if (!ext) {
    vscode.window.showErrorMessage(vscode.l10n.t('Extension not found.'));
    return;
  }
  const templatesUri = vscode.Uri.joinPath(ext.extensionUri, TEMPLATES_SUBDIR);
  await vscode.commands.executeCommand('revealFileInOS', templatesUri);
}
