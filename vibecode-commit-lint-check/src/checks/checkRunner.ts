import { spawn } from 'child_process';
import * as path from 'path';
import type { CheckDefinition, CheckRunRecord, CheckState } from './types';
import { getOutputChannel } from './outputChannel';

export interface RunResult {
  state: CheckState;
  record: CheckRunRecord;
}

export async function runCheck(
  id: string,
  def: CheckDefinition,
  workspaceFolder: string
): Promise<RunResult> {
  const channel = getOutputChannel();
  const cwd = path.resolve(workspaceFolder, def.cwd ?? '.');
  const startedAt = Date.now();
  const timestamp = new Date(startedAt).toISOString().replace('T', ' ').slice(0, 19);
  channel.appendLine(`[${timestamp}] ▶ ${id}`);
  channel.appendLine(`$ ${def.command}`);

  return new Promise<RunResult>(resolve => {
    const child = def.shell
      ? spawn(def.command, { cwd, shell: true })
      : spawn(def.command.split(/\s+/)[0], def.command.split(/\s+/).slice(1), { cwd });

    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', chunk => {
      const text = chunk.toString();
      stdout += text;
      channel.append(text);
    });
    child.stderr?.on('data', chunk => {
      const text = chunk.toString();
      stderr += text;
      channel.append(text);
    });
    child.on('error', err => {
      const finishedAt = Date.now();
      const durationMs = finishedAt - startedAt;
      channel.appendLine('');
      channel.appendLine(`✗ spawn error: ${err.message} (${durationMs}ms)`);
      channel.appendLine('');
      resolve({
        state: { kind: 'fail', exitCode: null, durationMs, reason: err.message },
        record: {
          id,
          command: def.command,
          cwd,
          startedAt,
          finishedAt,
          exitCode: null,
          stdout,
          stderr: stderr || err.message
        }
      });
    });
    child.on('close', code => {
      const finishedAt = Date.now();
      const durationMs = finishedAt - startedAt;
      const expected = def.expectExit ?? 0;
      const passed = code === expected;
      channel.appendLine('');
      channel.appendLine(`${passed ? '✓' : '✗'} exit ${code} (${durationMs}ms)`);
      channel.appendLine('');
      const state: CheckState = passed
        ? { kind: 'pass', exitCode: code ?? 0, durationMs }
        : {
            kind: 'fail',
            exitCode: code,
            durationMs,
            reason: firstLine(stderr) || firstLine(stdout) || `exit ${code}`
          };
      resolve({
        state,
        record: { id, command: def.command, cwd, startedAt, finishedAt, exitCode: code, stdout, stderr }
      });
    });
  });
}

function firstLine(s: string): string {
  const line = s.split(/\r?\n/).find(l => l.trim().length > 0);
  return line?.trim() ?? '';
}
