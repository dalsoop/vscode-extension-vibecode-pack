import * as vscode from 'vscode';
import { resolveMarkdownUri } from '../../utils';

export const handler = async (input?: unknown) => {
  const uri = await resolveMarkdownUri(input);
  if (!uri) return;
  await vscode.commands.executeCommand('markdown.showPreviewToSide', uri);
};
