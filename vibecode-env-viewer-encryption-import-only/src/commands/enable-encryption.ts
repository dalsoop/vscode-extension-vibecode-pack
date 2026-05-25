// "Enable Encryption" command — bootstraps the dotenvx keypair, embeds the
// public half in `.env`, writes `.env.keys`, updates `.gitignore`, and (if
// the user is still on the `none` strategy) flips the workspace setting to
// `dotenvx` so the editor actually encrypts the next paste.

import * as path from 'path';
import * as vscode from 'vscode';
import { SETTING_KEY, STRATEGY_ID } from '../crypto';
import { bootstrapDotenvxKeys, type BootstrapResult } from '../crypto/dotenvx';

export const COMMAND_ID = 'vibecode-env-viewer-encryption.enableEncryption';

export function registerEnableEncryption(_context: vscode.ExtensionContext): vscode.Disposable {
  return vscode.commands.registerCommand(COMMAND_ID, async (resourceUri?: vscode.Uri) => {
    const target = resolveEnvUri(resourceUri);
    if (!target) {
      void vscode.window.showErrorMessage(
        vscode.l10n.t('No .env file selected. Right-click a .env file in the Explorer or open one before running this command.')
      );
      return;
    }

    const result = await runBootstrap(target);
    if (!result) return;

    await ensureStrategySetting();
    await openKeysFile(result.envKeysPath);
    showSuccess(target, result);
  });
}

function resolveEnvUri(resourceUri?: vscode.Uri): vscode.Uri | null {
  if (resourceUri && looksLikeEnvFile(resourceUri.fsPath)) return resourceUri;
  const active = vscode.window.activeTextEditor?.document.uri;
  if (active && looksLikeEnvFile(active.fsPath)) return active;
  return null;
}

function looksLikeEnvFile(fsPath: string): boolean {
  const base = path.basename(fsPath);
  return base === '.env' || base.startsWith('.env.');
}

async function runBootstrap(target: vscode.Uri): Promise<BootstrapResult | null> {
  try {
    return await bootstrapDotenvxKeys(target.fsPath);
  } catch (err) {
    void vscode.window.showErrorMessage(
      vscode.l10n.t('Failed to enable encryption: {0}', (err as Error).message)
    );
    return null;
  }
}

async function ensureStrategySetting(): Promise<void> {
  const config = vscode.workspace.getConfiguration();
  const current = config.get<string>(SETTING_KEY.STRATEGY);
  if (current === STRATEGY_ID.DOTENVX) return;
  await config.update(SETTING_KEY.STRATEGY, STRATEGY_ID.DOTENVX, vscode.ConfigurationTarget.Workspace);
}

async function openKeysFile(keysPath: string): Promise<void> {
  await vscode.commands.executeCommand('vscode.open', vscode.Uri.file(keysPath));
}

function showSuccess(envUri: vscode.Uri, result: BootstrapResult): void {
  const envName = path.basename(envUri.fsPath);
  const lines = [
    vscode.l10n.t('Encryption enabled for {0}.', envName),
    vscode.l10n.t('Private key: {0}', path.basename(result.envKeysPath)),
    result.gitignoreUpdated
      ? vscode.l10n.t('.gitignore was updated.')
      : vscode.l10n.t('.gitignore already excludes the key file.'),
    vscode.l10n.t('Run `npx dotenvx run -- <your command>` to decrypt at runtime.')
  ];
  void vscode.window.showInformationMessage(lines.join(' '));
}
