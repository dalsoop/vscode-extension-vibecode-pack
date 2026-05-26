import * as vscode from 'vscode';
import { apps } from './apps';
import { fullCommandId } from './apps/_types';
import { ChecksState } from './checks/checksState';
import { ChecksTreeProvider } from './checks/checksTreeProvider';
import { CHECKS_VIEW_ID, type CheckEntry } from './checks/types';
import { runCheck as runCheckImpl } from './checks/checkRunner';
import { copySeedChecks } from './checks/seedChecks';
import { checksRootFor } from './checks/checkLoader';
import { getOutputChannel } from './checks/outputChannel';

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  for (const app of apps) {
    const id = fullCommandId(app.manifest.id);
    const disposable = vscode.commands.registerCommand(id, (arg, allUris) =>
      app.handler(arg as vscode.Uri | undefined, allUris as vscode.Uri[] | undefined)
    );
    context.subscriptions.push(disposable);
  }

  const checksState = new ChecksState();
  const checks = new ChecksTreeProvider(checksState);
  context.subscriptions.push(checksState);
  context.subscriptions.push(
    vscode.window.createTreeView(CHECKS_VIEW_ID, { treeDataProvider: checks })
  );
  await checks.refresh();

  context.subscriptions.push(
    vscode.commands.registerCommand('vibecodeFileLint.refreshChecks', () => checks.refresh())
  );
  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders(() => checks.refresh())
  );
  const checksWatcher = vscode.workspace.createFileSystemWatcher(
    '**/.vibecode/file-lint/**/check.json'
  );
  context.subscriptions.push(
    checksWatcher,
    checksWatcher.onDidCreate(() => checks.refresh()),
    checksWatcher.onDidChange(() => checks.refresh()),
    checksWatcher.onDidDelete(() => checks.refresh())
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('vibecodeFileLint.runCheck', async (idArg: unknown) => {
      const id = typeof idArg === 'string' ? idArg : undefined;
      if (!id) return;
      const ws = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!ws) return;
      const entry = checks.getEntries().find(e => e.id === id);
      if (!entry || !entry.parsed.ok) return;
      await runOne(entry, ws, checksState);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('vibecodeFileLint.runAllChecks', async () => {
      const ws = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!ws) return;
      const entries = checks.getEntries().filter(e => e.parsed.ok);
      for (const entry of entries) await runOne(entry, ws, checksState);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('vibecodeFileLint.revealChecksFolder', async () => {
      const ws = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!ws) {
        vscode.window.showWarningMessage(vscode.l10n.t('No workspace folder open.'));
        return;
      }
      const folder = vscode.Uri.file(checksRootFor(ws));
      await vscode.commands.executeCommand('revealFileInOS', folder);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('vibecodeFileLint.scaffoldDefaultChecks', async () => {
      const ws = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!ws) {
        vscode.window.showWarningMessage(vscode.l10n.t('No workspace folder open.'));
        return;
      }
      const result = await copySeedChecks(ws);
      await checks.refresh();
      const msg =
        result.written.length > 0
          ? vscode.l10n.t('Scaffolded {0} default check(s).', String(result.written.length))
          : vscode.l10n.t('Default checks already present.');
      vscode.window.showInformationMessage(msg);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('vibecodeFileLint.showCheckOutput', () => {
      getOutputChannel().show(true);
    })
  );
}

async function runOne(entry: CheckEntry, ws: string, state: ChecksState): Promise<void> {
  if (!entry.parsed.ok) return;
  state.setState(entry.id, { kind: 'running' });
  const result = await runCheckImpl(entry.id, entry.parsed.definition, ws);
  state.setResult(entry.id, result.state, result.record);
}

export function deactivate(): void {}
