import * as vscode from 'vscode';
import type { ILogger } from '../core/types';

export class VsCodeLogger implements ILogger {
  private readonly out: vscode.LogOutputChannel;
  constructor(name: string) {
    this.out = vscode.window.createOutputChannel(name, { log: true });
  }
  debug(msg: string, meta?: object) { this.out.debug(meta ? `${msg} ${JSON.stringify(meta)}` : msg); }
  info(msg: string, meta?: object) { this.out.info(meta ? `${msg} ${JSON.stringify(meta)}` : msg); }
  warn(msg: string, meta?: object) { this.out.warn(meta ? `${msg} ${JSON.stringify(meta)}` : msg); }
  error(msg: string, meta?: object) { this.out.error(meta ? `${msg} ${JSON.stringify(meta)}` : msg); }
}
