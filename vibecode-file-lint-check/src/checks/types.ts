/** Parsed contents of a check.json file. */
export interface CheckDefinition {
  /** Required. Shell command (or argv when shell=false) to run. */
  command: string;
  /** Optional. Falls back to folder name with leading `NNN-` stripped. */
  label?: string;
  /** Optional. Shown as tree item description and in tooltip. */
  description?: string;
  /** Optional. Exit code that counts as pass. Default 0. */
  expectExit?: number;
  /** Optional. Relative to workspace root. Must not escape via `..`. Default '.'. */
  cwd?: string;
  /** Optional. Default true. If false, command is parsed with shell-quote rules. */
  shell?: boolean;
}

/** One discovered check folder. */
export interface CheckEntry {
  /** Stable id == folder basename (e.g. `010-subject-length`). */
  id: string;
  /** Absolute path to the check's own directory. */
  dir: string;
  /** Either a parsed definition or a parse error. */
  parsed:
    | { ok: true; definition: CheckDefinition; resolvedLabel: string }
    | { ok: false; error: string };
}

export type CheckState =
  | { kind: 'idle' }
  | { kind: 'running' }
  | { kind: 'pass'; exitCode: number; durationMs: number }
  | { kind: 'fail'; exitCode: number | null; durationMs: number; reason: string };

export interface CheckRunRecord {
  id: string;
  command: string;
  cwd: string;
  startedAt: number;
  finishedAt: number | null;
  exitCode: number | null;
  stdout: string;
  stderr: string;
}

export const CHECKS_DIRNAME = '.vibecode/file-lint';
export const CHECK_FILENAME = 'check.json';
export const CHECKS_VIEW_ID = 'vibecodeFileLint.checks';
