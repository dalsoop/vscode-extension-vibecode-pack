
import * as vscode from 'vscode';
import type { WebviewToHost } from './messages';

export interface HandlerContext {
  uri: vscode.Uri;
}

export async function handle(msg: WebviewToHost, ctx: HandlerContext): Promise<void> {
  switch (msg.type) {
    case 'copyText':
      await vscode.env.clipboard.writeText(msg.text);
      if (msg.toast) vscode.window.setStatusBarMessage(msg.toast, 2000);
      return;
    case 'revealInOs':
      await vscode.commands.executeCommand('revealFileInOS', ctx.uri);
      return;
    case 'openWithDefaultApp':
      await vscode.env.openExternal(ctx.uri);
      return;
    case 'reopenAsText':
      await vscode.commands.executeCommand(
        'vscode.openWith',
        ctx.uri,
        'default',
      );
      return;
    case 'openUrl':
      try {
        await vscode.env.openExternal(vscode.Uri.parse(msg.url));
      } catch {
      }
      return;
    case 'openSettings':
      await vscode.commands.executeCommand(
        'workbench.action.openSettings',
        '@ext:dalsoop.vibecode-image-viewer'
      );
      return;
  }
}
