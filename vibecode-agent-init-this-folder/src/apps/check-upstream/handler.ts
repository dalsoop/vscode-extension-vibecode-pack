import * as vscode from 'vscode';
import * as fs from 'fs';
import type { AgentTemplate } from '../_types';

export async function handler(arg: vscode.Uri | undefined): Promise<void> {
  const uri = arg ?? vscode.window.activeTextEditor?.document.uri;
  if (!uri) {
    vscode.window.showWarningMessage(vscode.l10n.t('No template.json active.'));
    return;
  }

  let template: AgentTemplate;
  try {
    const raw = await fs.promises.readFile(uri.fsPath, 'utf8');
    template = JSON.parse(raw);
  } catch (err) {
    vscode.window.showErrorMessage(
      vscode.l10n.t('Cannot read template.json: {0}', String((err as Error).message))
    );
    return;
  }

  const upstream = template.upstream_url?.trim();
  if (!upstream) {
    vscode.window.showInformationMessage(
      vscode.l10n.t('No upstream_url set. Edit the JSON to add one.')
    );
    return;
  }

  // Sync logic is a stub. Real fetch/compare is intentionally not implemented yet —
  // present the decision UX so the flow is reviewable end-to-end.
  const ssotLabel =
    template.ssot === 'upstream'
      ? vscode.l10n.t('upstream (recommended pull)')
      : vscode.l10n.t('local (recommended push)');

  const choice = await vscode.window.showInformationMessage(
    vscode.l10n.t(
      'Upstream: {0}\nDeclared SSOT: {1}\n\nSync direction:',
      upstream,
      ssotLabel
    ),
    { modal: true },
    vscode.l10n.t('Pull (upstream → local)'),
    vscode.l10n.t('Push (local → upstream)')
  );

  if (!choice) return;
  vscode.window.showInformationMessage(
    vscode.l10n.t('Stub: would {0}. Sync logic is not implemented in v0.1.', choice)
  );
}
