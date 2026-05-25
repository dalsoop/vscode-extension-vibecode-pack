import * as vscode from 'vscode';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

let channel: vscode.LogOutputChannel | null = null;
let fallback = false;

function ensure(): vscode.LogOutputChannel | null {
  if (channel) return channel;
  if (fallback) return null;
  try {
    channel = vscode.window.createOutputChannel('Claude & Codex Skills', { log: true });
    return channel;
  } catch {
    fallback = true;
    return null;
  }
}

function emit(level: LogLevel, msg: string, ...rest: unknown[]): void {
  const ch = ensure();
  if (ch) {
    switch (level) {
      case 'debug':
        ch.debug(msg, ...rest);
        break;
      case 'info':
        ch.info(msg, ...rest);
        break;
      case 'warn':
        ch.warn(msg, ...rest);
        break;
      case 'error':
        ch.error(msg, ...rest);
        break;
    }
  } else {
    // pre-init / non-vscode (tests, smoke check) → console
    const c = level === 'error' || level === 'warn' ? console.error : console.warn;
    c(`[ccskills ${level}]`, msg, ...rest);
  }
}

export const log = {
  debug: (msg: string, ...rest: unknown[]) => emit('debug', msg, ...rest),
  info: (msg: string, ...rest: unknown[]) => emit('info', msg, ...rest),
  warn: (msg: string, ...rest: unknown[]) => emit('warn', msg, ...rest),
  error: (msg: string, ...rest: unknown[]) => emit('error', msg, ...rest),
  show: () => ensure()?.show(),
  dispose: () => {
    channel?.dispose();
    channel = null;
  }
};
