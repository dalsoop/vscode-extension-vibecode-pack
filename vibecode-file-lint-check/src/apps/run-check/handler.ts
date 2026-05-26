import * as vscode from 'vscode';
import type { ChecksNode } from '../../checks/checksTreeProvider';

export const handler = (arg: unknown) => {
  const node = arg as ChecksNode | undefined;
  if (!node || node.kind !== 'check') return;
  return vscode.commands.executeCommand('vibecodeFileLint.runCheck', node.entry.id);
};
