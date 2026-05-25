import * as vscode from 'vscode';
import type { ILogger } from '../core/types';

/**
 * Output channel is created lazily on first log call to avoid cluttering the
 * View → Output dropdown for users who never hit a warn/error path.
 */
export class VsCodeLogger implements ILogger {
  private out: vscode.LogOutputChannel | undefined;
  constructor(private readonly name: string) {}

  private channel(): vscode.LogOutputChannel {
    return this.out ??= vscode.window.createOutputChannel(this.name, { log: true });
  }

  debug(msg: string, meta?: object) { this.channel().debug(meta ? `${msg} ${JSON.stringify(meta)}` : msg); }
  info(msg: string, meta?: object) { this.channel().info(meta ? `${msg} ${JSON.stringify(meta)}` : msg); }
  warn(msg: string, meta?: object) { this.channel().warn(meta ? `${msg} ${JSON.stringify(meta)}` : msg); }
  error(msg: string, meta?: object) { this.channel().error(meta ? `${msg} ${JSON.stringify(meta)}` : msg); }
}
