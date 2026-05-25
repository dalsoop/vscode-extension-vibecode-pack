import * as vscode from 'vscode';
import * as path from 'path';
import { findConflicts, copyTree } from '../../copy-utils';

/**
 * Force re-install of a single tool variant into the workspace root, even if already present.
 * Triggered from the right-click "🔄" inline action on an already-installed tool item.
 */
export async function handler(node: unknown): Promise<void> {
  const ctx = extractToolContext(node);
  if (!ctx) {
    vscode.window.showWarningMessage(
      vscode.l10n.t('Right-click a tool variant (☐ leaf) to re-install.')
    );
    return;
  }
  const target = vscode.workspace.workspaceFolders?.[0]?.uri;
  if (!target) {
    vscode.window.showWarningMessage(
      vscode.l10n.t('Open a workspace folder first — re-install targets the workspace root.')
    );
    return;
  }

  const conflicts = await findConflicts(ctx.variantRootPath, target.fsPath);
  const choice = await vscode.window.showWarningMessage(
    vscode.l10n.t(
      'Force re-install "{0}/{1}" → {2}? {3} file(s) will be overwritten.',
      ctx.templateName,
      ctx.tool,
      target.fsPath,
      String(conflicts.length)
    ),
    { modal: true },
    vscode.l10n.t('Overwrite')
  );
  if (!choice) return;

  await copyTree(ctx.variantRootPath, target.fsPath, { overwrite: true });
  vscode.window.showInformationMessage(
    vscode.l10n.t('Re-installed {0}/{1} → {2}', ctx.templateName, ctx.tool, target.fsPath)
  );
  await vscode.commands.executeCommand('vibecodeAiMdSystem.refreshTemplates');
}

function extractToolContext(
  node: unknown
): { templateName: string; tool: string; variantRootPath: string } | undefined {
  if (!node || typeof node !== 'object') return undefined;
  const n = node as {
    kind?: string;
    templateName?: string;
    templateRootUri?: vscode.Uri;
    tool?: string;
  };
  if (n.kind !== 'tool' || !n.templateName || !n.templateRootUri || !n.tool) return undefined;
  return {
    templateName: n.templateName,
    tool: n.tool,
    variantRootPath: path.join(n.templateRootUri.fsPath, n.tool)
  };
}
