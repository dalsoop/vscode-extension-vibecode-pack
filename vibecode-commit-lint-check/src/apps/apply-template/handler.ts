import * as vscode from 'vscode';
import { readTemplateAt } from '../../lib/templateUtils';
import { applyAndReport } from '../init-from-template/handler';

interface ApplyArgs {
  templateDir: string;
  targetFolder: string;
}

export async function handler(arg: vscode.Uri | ApplyArgs | undefined): Promise<void> {
  if (!arg || arg instanceof vscode.Uri) {
    vscode.window.showWarningMessage(vscode.l10n.t('applyTemplate called without template/target args.'));
    return;
  }
  const { templateDir, targetFolder } = arg as ApplyArgs;
  const template = await readTemplateAt(templateDir);
  if (!template) {
    vscode.window.showWarningMessage(vscode.l10n.t('Template at {0} is invalid or missing.', templateDir));
    return;
  }
  await applyAndReport(targetFolder, template);
}
