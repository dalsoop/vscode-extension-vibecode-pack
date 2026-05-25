# Commit-Lint Checks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **Session policy: bundle all changes into ONE commit at the end (do not commit per task).**

**Goal:** Add a second sidebar view "Checks" to `vibecode-commit-lint-check` that reads `.vibecode/code-lint/<NNN-name>/check.json` from the workspace and runs each check on demand, showing pass/fail in the tree.

**Architecture:** A new `src/checks/` module owns scanning, parsing, execution, state, and the `TreeDataProvider`. Six new `apps/<command>/` modules expose the user-facing commands and run through the existing sync-contributions pipeline. Bundled default checks ship under `bundled-checks/` (sibling to the existing `templates/`).

**Tech Stack:** TypeScript, VSCode Extension API (`TreeDataProvider`, `OutputChannel`), `child_process.spawn`, the existing `scripts/sync-contributions.mjs` build glue.

**Spec:** [docs/superpowers/specs/2026-05-25-commit-lint-checks-design.md](../specs/2026-05-25-commit-lint-checks-design.md)

---

## File Structure

```
vibecode-commit-lint-check/
├── bundled-checks/                           # NEW — seed checks shipped in vsix
│   ├── 010-subject-length/check.json
│   ├── 020-subject-type-prefix/check.json
│   ├── 030-body-blank-line-after-subject/check.json
│   └── 040-commitlint-run/check.json
├── src/
│   ├── apps/
│   │   ├── run-all-checks/                   # NEW
│   │   ├── run-check/                        # NEW
│   │   ├── refresh-checks/                   # NEW
│   │   ├── reveal-checks-folder/             # NEW
│   │   ├── scaffold-default-checks/          # NEW
│   │   └── show-check-output/                # NEW
│   ├── checks/                               # NEW — engine
│   │   ├── types.ts                          # CheckDefinition, CheckState, CheckRecord
│   │   ├── checkLoader.ts                    # scan .vibecode/code-lint, parse check.json
│   │   ├── checkRunner.ts                    # spawn + capture exit/stdout/stderr
│   │   ├── checksState.ts                    # in-memory state, fires onChange
│   │   ├── checksTreeProvider.ts             # TreeDataProvider for checks view
│   │   ├── outputChannel.ts                  # singleton OutputChannel
│   │   └── seedChecks.ts                     # copy bundled-checks → .vibecode/code-lint
│   └── extension.ts                          # MODIFY — register checks view + activation
├── package.json                              # MODIFY — add second view, activation events
├── package.nls.json                          # MODIFY — view.checks.name (en)
├── package.nls.ko.json                       # MODIFY — view.checks.name (ko)
├── i18n/ko.json                              # MODIFY — view.checks + commands + runtime
└── .vscodeignore                             # (no change — bundled-checks/ ships by default)
```

**Notes on existing patterns:**
- Each `apps/<id>/` has `manifest.ts` (data literal exporting `manifest`), `handler.ts`, `index.ts` (re-export). `scripts/sync-contributions.mjs` reads these to generate `package.json#contributes.commands` + `menus` and `package.nls.json#cmd.<id>`.
- View containers and views are NOT managed by the sync script — they live directly in `package.json#contributes.views`.
- `extensionRoot()` in [src/lib/templateUtils.ts](../../vibecode-commit-lint-check/src/lib/templateUtils.ts) resolves the extension root from `dist/extension.js`'s `__dirname` — reuse this pattern for `bundled-checks/`.
- Runtime strings go through `vscode.l10n.t()` with Korean translations in `i18n/ko.json#runtime` → synced into `l10n/bundle.l10n.ko.json` by `sync-contributions.mjs`.

---

## Task 1: Seed bundled-checks/ fixtures

**Files:**
- Create: `vibecode-commit-lint-check/bundled-checks/010-subject-length/check.json`
- Create: `vibecode-commit-lint-check/bundled-checks/020-subject-type-prefix/check.json`
- Create: `vibecode-commit-lint-check/bundled-checks/030-body-blank-line-after-subject/check.json`
- Create: `vibecode-commit-lint-check/bundled-checks/040-commitlint-run/check.json`

- [ ] **Step 1.1: Write `010-subject-length/check.json`**

```json
{
  "label": "Subject ≤ 72 chars",
  "description": "First line of HEAD commit fits in 72 characters",
  "command": "git log -1 --pretty=%s | awk '{exit (length>72)}'"
}
```

- [ ] **Step 1.2: Write `020-subject-type-prefix/check.json`**

```json
{
  "label": "Conventional Commits type prefix",
  "description": "Subject starts with feat|fix|chore|docs|refactor|test|build|ci|perf|style|revert (optional scope, optional !) followed by ': '",
  "command": "git log -1 --pretty=%s | grep -qE '^(feat|fix|chore|docs|refactor|test|build|ci|perf|style|revert)(\\(.+\\))?!?: '"
}
```

- [ ] **Step 1.3: Write `030-body-blank-line-after-subject/check.json`**

```json
{
  "label": "Blank line after subject",
  "description": "Line 2 of HEAD commit message is empty (or message has only one line)",
  "command": "git log -1 --pretty=%B | awk 'NR==2 && NF{exit 1} END{exit 0}'"
}
```

- [ ] **Step 1.4: Write `040-commitlint-run/check.json`**

```json
{
  "label": "commitlint on HEAD",
  "description": "Run `npx commitlint --from HEAD~1 --to HEAD`. Requires network on first run.",
  "command": "npx --yes commitlint --from HEAD~1 --to HEAD"
}
```

---

## Task 2: Types

**Files:**
- Create: `vibecode-commit-lint-check/src/checks/types.ts`

- [ ] **Step 2.1: Write `types.ts`**

```ts
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

export const CHECKS_DIRNAME = '.vibecode/code-lint';
export const CHECK_FILENAME = 'check.json';
export const CHECKS_VIEW_ID = 'vibecodeCommitLint.checks';
```

---

## Task 3: Check loader

**Files:**
- Create: `vibecode-commit-lint-check/src/checks/checkLoader.ts`

- [ ] **Step 3.1: Write `checkLoader.ts`**

```ts
import * as path from 'path';
import * as fs from 'fs';
import { CHECKS_DIRNAME, CHECK_FILENAME, type CheckDefinition, type CheckEntry } from './types';

export function checksRootFor(workspaceFolder: string): string {
  return path.join(workspaceFolder, CHECKS_DIRNAME);
}

/** Lexicographic by folder name; folders without check.json are skipped silently. */
export async function loadChecks(workspaceFolder: string): Promise<CheckEntry[]> {
  const root = checksRootFor(workspaceFolder);
  let entries: fs.Dirent[];
  try {
    entries = await fs.promises.readdir(root, { withFileTypes: true });
  } catch {
    return [];
  }
  const dirs = entries.filter(e => e.isDirectory()).sort((a, b) => a.name.localeCompare(b.name));
  const out: CheckEntry[] = [];
  for (const d of dirs) {
    const dir = path.join(root, d.name);
    const file = path.join(dir, CHECK_FILENAME);
    let raw: string;
    try {
      raw = await fs.promises.readFile(file, 'utf8');
    } catch {
      continue; // folder without check.json — skip (don't surface as parse error)
    }
    out.push(buildEntry(d.name, dir, raw, workspaceFolder));
  }
  return out;
}

function buildEntry(id: string, dir: string, raw: string, workspaceFolder: string): CheckEntry {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    return { id, dir, parsed: { ok: false, error: `Invalid JSON: ${(err as Error).message}` } };
  }
  const def = parsed as Partial<CheckDefinition>;
  if (typeof def.command !== 'string' || def.command.trim() === '') {
    return { id, dir, parsed: { ok: false, error: 'Missing or empty "command".' } };
  }
  if (def.cwd !== undefined && typeof def.cwd !== 'string') {
    return { id, dir, parsed: { ok: false, error: '"cwd" must be a string.' } };
  }
  if (def.cwd && escapesWorkspace(def.cwd, workspaceFolder)) {
    return { id, dir, parsed: { ok: false, error: '"cwd" must stay inside the workspace.' } };
  }
  if (def.expectExit !== undefined && typeof def.expectExit !== 'number') {
    return { id, dir, parsed: { ok: false, error: '"expectExit" must be a number.' } };
  }
  if (def.shell !== undefined && typeof def.shell !== 'boolean') {
    return { id, dir, parsed: { ok: false, error: '"shell" must be a boolean.' } };
  }
  const definition: CheckDefinition = {
    command: def.command,
    label: typeof def.label === 'string' ? def.label : undefined,
    description: typeof def.description === 'string' ? def.description : undefined,
    expectExit: def.expectExit ?? 0,
    cwd: def.cwd ?? '.',
    shell: def.shell ?? true
  };
  const resolvedLabel = definition.label?.trim() || stripPrefix(id);
  return { id, dir, parsed: { ok: true, definition, resolvedLabel } };
}

function stripPrefix(id: string): string {
  return id.replace(/^\d+[-_]/, '');
}

function escapesWorkspace(cwd: string, workspaceFolder: string): boolean {
  const resolved = path.resolve(workspaceFolder, cwd);
  const rel = path.relative(workspaceFolder, resolved);
  return rel.startsWith('..') || path.isAbsolute(rel);
}
```

---

## Task 4: Output channel singleton

**Files:**
- Create: `vibecode-commit-lint-check/src/checks/outputChannel.ts`

- [ ] **Step 4.1: Write `outputChannel.ts`**

```ts
import * as vscode from 'vscode';

const CHANNEL_NAME = 'Vibecode Commit Lint';
let channel: vscode.OutputChannel | undefined;

export function getOutputChannel(): vscode.OutputChannel {
  if (!channel) channel = vscode.window.createOutputChannel(CHANNEL_NAME);
  return channel;
}

export function disposeOutputChannel(): void {
  channel?.dispose();
  channel = undefined;
}
```

---

## Task 5: Check runner

**Files:**
- Create: `vibecode-commit-lint-check/src/checks/checkRunner.ts`

- [ ] **Step 5.1: Write `checkRunner.ts`**

```ts
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
        record: { id, command: def.command, cwd, startedAt, finishedAt, exitCode: null, stdout, stderr: stderr || err.message }
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
```

---

## Task 6: State map

**Files:**
- Create: `vibecode-commit-lint-check/src/checks/checksState.ts`

- [ ] **Step 6.1: Write `checksState.ts`**

```ts
import * as vscode from 'vscode';
import type { CheckRunRecord, CheckState } from './types';

interface Entry {
  state: CheckState;
  lastRecord: CheckRunRecord | null;
}

export class ChecksState {
  private readonly map = new Map<string, Entry>();
  private readonly emitter = new vscode.EventEmitter<string | undefined>();
  readonly onDidChange = this.emitter.event;

  get(id: string): Entry {
    return this.map.get(id) ?? { state: { kind: 'idle' }, lastRecord: null };
  }

  setState(id: string, state: CheckState): void {
    const prev = this.get(id);
    this.map.set(id, { ...prev, state });
    this.emitter.fire(id);
  }

  setResult(id: string, state: CheckState, record: CheckRunRecord): void {
    this.map.set(id, { state, lastRecord: record });
    this.emitter.fire(id);
  }

  dispose(): void {
    this.emitter.dispose();
  }
}
```

---

## Task 7: Seed copier

**Files:**
- Create: `vibecode-commit-lint-check/src/checks/seedChecks.ts`

- [ ] **Step 7.1: Write `seedChecks.ts`**

```ts
import * as path from 'path';
import * as fs from 'fs';
import { extensionRoot } from '../lib/templateUtils';
import { CHECKS_DIRNAME, CHECK_FILENAME } from './types';

const BUNDLED_DIRNAME = 'bundled-checks';

export interface SeedResult {
  written: string[];
  skipped: string[];
  targetRoot: string;
}

/** Copy each bundled-checks/<dir>/check.json to <workspaceFolder>/.vibecode/code-lint/<dir>/check.json. Skip existing dirs. */
export async function copySeedChecks(workspaceFolder: string): Promise<SeedResult> {
  const src = path.join(extensionRoot(), BUNDLED_DIRNAME);
  const dst = path.join(workspaceFolder, CHECKS_DIRNAME);
  await fs.promises.mkdir(dst, { recursive: true });

  const written: string[] = [];
  const skipped: string[] = [];
  let entries: fs.Dirent[];
  try {
    entries = await fs.promises.readdir(src, { withFileTypes: true });
  } catch {
    return { written, skipped, targetRoot: dst };
  }
  for (const e of entries.filter(e => e.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
    const srcFile = path.join(src, e.name, CHECK_FILENAME);
    const dstDir = path.join(dst, e.name);
    const dstFile = path.join(dstDir, CHECK_FILENAME);
    if (fs.existsSync(dstFile)) {
      skipped.push(e.name);
      continue;
    }
    try {
      const raw = await fs.promises.readFile(srcFile, 'utf8');
      await fs.promises.mkdir(dstDir, { recursive: true });
      await fs.promises.writeFile(dstFile, raw, 'utf8');
      written.push(e.name);
    } catch {
      // skip unreadable seeds silently
    }
  }
  return { written, skipped, targetRoot: dst };
}
```

---

## Task 8: Tree provider

**Files:**
- Create: `vibecode-commit-lint-check/src/checks/checksTreeProvider.ts`

- [ ] **Step 8.1: Write `checksTreeProvider.ts`**

```ts
import * as vscode from 'vscode';
import { loadChecks } from './checkLoader';
import type { CheckEntry, CheckState } from './types';
import { ChecksState } from './checksState';

export type ChecksNode =
  | { kind: 'check'; entry: CheckEntry }
  | { kind: 'empty'; label: string; commandId?: string }
  | { kind: 'invalid'; entry: CheckEntry };

const RUN_COMMAND_ID = 'vibecodeCommitLint.runCheck';
const SHOW_OUTPUT_COMMAND_ID = 'vibecodeCommitLint.showCheckOutput';
const SCAFFOLD_COMMAND_ID = 'vibecodeCommitLint.scaffoldDefaultChecks';

export class ChecksTreeProvider implements vscode.TreeDataProvider<ChecksNode> {
  private readonly emitter = new vscode.EventEmitter<ChecksNode | undefined>();
  readonly onDidChangeTreeData = this.emitter.event;
  private entries: CheckEntry[] = [];

  constructor(private readonly state: ChecksState) {
    state.onDidChange(() => this.emitter.fire(undefined));
  }

  async refresh(): Promise<void> {
    const ws = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    this.entries = ws ? await loadChecks(ws) : [];
    this.emitter.fire(undefined);
  }

  getEntries(): CheckEntry[] {
    return this.entries;
  }

  async getChildren(node?: ChecksNode): Promise<ChecksNode[]> {
    if (node) return [];
    if (this.entries.length === 0) {
      return [
        {
          kind: 'empty',
          label: vscode.l10n.t('Click to scaffold default checks'),
          commandId: SCAFFOLD_COMMAND_ID
        }
      ];
    }
    return this.entries.map(entry =>
      entry.parsed.ok ? { kind: 'check', entry } : { kind: 'invalid', entry }
    );
  }

  getTreeItem(node: ChecksNode): vscode.TreeItem {
    if (node.kind === 'empty') {
      const item = new vscode.TreeItem(node.label, vscode.TreeItemCollapsibleState.None);
      item.iconPath = new vscode.ThemeIcon('lightbulb');
      if (node.commandId) {
        item.command = { command: node.commandId, title: node.label };
      }
      return item;
    }
    if (node.kind === 'invalid') {
      const errMsg = node.entry.parsed.ok ? '' : node.entry.parsed.error;
      const item = new vscode.TreeItem(node.entry.id, vscode.TreeItemCollapsibleState.None);
      item.description = vscode.l10n.t('parse error');
      item.tooltip = `${node.entry.dir}\n${errMsg}`;
      item.iconPath = new vscode.ThemeIcon(
        'warning',
        new vscode.ThemeColor('editorWarning.foreground')
      );
      item.contextValue = 'commitLintCheckInvalid';
      return item;
    }
    const entry = node.entry;
    const parsed = entry.parsed.ok ? entry.parsed : null;
    if (!parsed) return new vscode.TreeItem(entry.id);
    const { state, lastRecord } = this.state.get(entry.id);
    const item = new vscode.TreeItem(parsed.resolvedLabel, vscode.TreeItemCollapsibleState.None);
    item.description = parsed.definition.description;
    item.iconPath = iconFor(state);
    item.tooltip = tooltipFor(parsed.resolvedLabel, parsed.definition.description, state);
    item.contextValue = 'commitLintCheck';
    item.command = {
      command: SHOW_OUTPUT_COMMAND_ID,
      title: vscode.l10n.t('Show Last Output'),
      arguments: [entry.id]
    };
    return item;
  }
}

function iconFor(state: CheckState): vscode.ThemeIcon {
  switch (state.kind) {
    case 'pass':
      return new vscode.ThemeIcon('pass', new vscode.ThemeColor('charts.green'));
    case 'fail':
      return new vscode.ThemeIcon('error', new vscode.ThemeColor('errorForeground'));
    case 'running':
      return new vscode.ThemeIcon('sync~spin');
    case 'idle':
    default:
      return new vscode.ThemeIcon('circle-large-outline');
  }
}

function tooltipFor(label: string, description: string | undefined, state: CheckState): string {
  const head = description ? `${label}\n${description}` : label;
  switch (state.kind) {
    case 'pass':
      return `${head}\n\n✓ pass (exit ${state.exitCode}, ${state.durationMs}ms)`;
    case 'fail':
      return `${head}\n\n✗ fail: ${state.reason}`;
    case 'running':
      return `${head}\n\n⏳ running…`;
    case 'idle':
    default:
      return head;
  }
}
```

---

## Task 9: New apps — manifests + handlers

**Files (per app: 3 files each):**
- Create: `vibecode-commit-lint-check/src/apps/run-all-checks/{manifest,handler,index}.ts`
- Create: `vibecode-commit-lint-check/src/apps/run-check/{manifest,handler,index}.ts`
- Create: `vibecode-commit-lint-check/src/apps/refresh-checks/{manifest,handler,index}.ts`
- Create: `vibecode-commit-lint-check/src/apps/reveal-checks-folder/{manifest,handler,index}.ts`
- Create: `vibecode-commit-lint-check/src/apps/scaffold-default-checks/{manifest,handler,index}.ts`
- Create: `vibecode-commit-lint-check/src/apps/show-check-output/{manifest,handler,index}.ts`

All six `index.ts` files have the same shape:

```ts
import type { AppModule } from '../_types';
import { manifest } from './manifest';
import { handler } from './handler';
export default { manifest, handler } satisfies AppModule;
```

All six handlers defer to a command registered in `extension.ts` (where the provider/state instances live). This mirrors the existing `refresh-tree` pattern.

- [ ] **Step 9.1: `run-all-checks/manifest.ts`**

```ts
import type { AppManifest } from '../_types';

export const manifest: AppManifest = {
  id: 'runAllChecks',
  title: 'Vibecode - Run All Commit-Lint Checks',
  description: 'Run every check in .vibecode/code-lint/ sequentially.',
  icon: 'run-all',
  menus: [
    {
      where: 'view/title',
      when: 'view == vibecodeCommitLint.checks',
      group: 'navigation@1'
    }
  ]
};
```

- [ ] **Step 9.2: `run-all-checks/handler.ts`**

```ts
import * as vscode from 'vscode';

export const handler = () => vscode.commands.executeCommand('vibecodeCommitLint.runAllChecks');
```

- [ ] **Step 9.3: `run-all-checks/index.ts`** (see common shape above)

- [ ] **Step 9.4: `run-check/manifest.ts`**

```ts
import type { AppManifest } from '../_types';

export const manifest: AppManifest = {
  id: 'runCheck',
  title: 'Vibecode - Run Commit-Lint Check',
  description: 'Run a single check by id (used by tree right-click).',
  icon: 'play',
  menus: [
    {
      where: 'view/item/context',
      when: 'view == vibecodeCommitLint.checks && viewItem == commitLintCheck',
      group: 'inline'
    }
  ],
  palette: false
};
```

- [ ] **Step 9.5: `run-check/handler.ts`**

```ts
import * as vscode from 'vscode';
import type { ChecksNode } from '../../checks/checksTreeProvider';

export const handler = (arg: unknown) => {
  // Invoked from tree (passes a ChecksNode) or palette (no arg — disabled via palette:false).
  const node = arg as ChecksNode | undefined;
  if (!node || node.kind !== 'check') return;
  return vscode.commands.executeCommand('vibecodeCommitLint.runCheck', node.entry.id);
};
```

- [ ] **Step 9.6: `run-check/index.ts`** (common shape)

- [ ] **Step 9.7: `refresh-checks/manifest.ts`**

```ts
import type { AppManifest } from '../_types';

export const manifest: AppManifest = {
  id: 'refreshChecks',
  title: 'Vibecode - Refresh Commit-Lint Checks',
  description: 'Re-scan .vibecode/code-lint/.',
  icon: 'refresh',
  menus: [
    {
      where: 'view/title',
      when: 'view == vibecodeCommitLint.checks',
      group: 'navigation@2'
    }
  ]
};
```

- [ ] **Step 9.8: `refresh-checks/handler.ts`**

```ts
import * as vscode from 'vscode';

export const handler = () => vscode.commands.executeCommand('vibecodeCommitLint.refreshChecks');
```

- [ ] **Step 9.9: `refresh-checks/index.ts`** (common shape)

- [ ] **Step 9.10: `reveal-checks-folder/manifest.ts`**

```ts
import type { AppManifest } from '../_types';

export const manifest: AppManifest = {
  id: 'revealChecksFolder',
  title: 'Vibecode - Reveal Commit-Lint Checks Folder',
  description: 'Open .vibecode/code-lint/ in the file explorer.',
  icon: 'folder-opened',
  menus: [
    {
      where: 'view/title',
      when: 'view == vibecodeCommitLint.checks',
      group: 'navigation@3'
    }
  ]
};
```

- [ ] **Step 9.11: `reveal-checks-folder/handler.ts`**

```ts
import * as vscode from 'vscode';

export const handler = () => vscode.commands.executeCommand('vibecodeCommitLint.revealChecksFolder');
```

- [ ] **Step 9.12: `reveal-checks-folder/index.ts`** (common shape)

- [ ] **Step 9.13: `scaffold-default-checks/manifest.ts`**

```ts
import type { AppManifest } from '../_types';

export const manifest: AppManifest = {
  id: 'scaffoldDefaultChecks',
  title: 'Vibecode - Scaffold Default Commit-Lint Checks',
  description: 'Copy bundled default checks into .vibecode/code-lint/ (existing folders skipped).',
  icon: 'rocket',
  menus: []
};
```

- [ ] **Step 9.14: `scaffold-default-checks/handler.ts`**

```ts
import * as vscode from 'vscode';

export const handler = () => vscode.commands.executeCommand('vibecodeCommitLint.scaffoldDefaultChecks');
```

- [ ] **Step 9.15: `scaffold-default-checks/index.ts`** (common shape)

- [ ] **Step 9.16: `show-check-output/manifest.ts`**

```ts
import type { AppManifest } from '../_types';

export const manifest: AppManifest = {
  id: 'showCheckOutput',
  title: 'Vibecode - Show Commit-Lint Check Output',
  description: 'Focus the shared output channel (internal — bound to tree node click).',
  menus: [],
  palette: false
};
```

- [ ] **Step 9.17: `show-check-output/handler.ts`**

```ts
import * as vscode from 'vscode';

export const handler = () => vscode.commands.executeCommand('vibecodeCommitLint.showCheckOutput');
```

- [ ] **Step 9.18: `show-check-output/index.ts`** (common shape)

---

## Task 10: Register new apps in `apps/index.ts`

**Files:**
- Modify: `vibecode-commit-lint-check/src/apps/index.ts`

- [ ] **Step 10.1: Replace `apps/index.ts`**

```ts
import type { AppModule } from './_types';
import initFromTemplate from './init-from-template';
import checkLastCommit from './check-last-commit';
import addTemplate from './add-template';
import applyTemplate from './apply-template';
import refreshTree from './refresh-tree';
import openSettings from './open-settings';
import runAllChecks from './run-all-checks';
import runCheck from './run-check';
import refreshChecks from './refresh-checks';
import revealChecksFolder from './reveal-checks-folder';
import scaffoldDefaultChecks from './scaffold-default-checks';
import showCheckOutput from './show-check-output';

export const apps: AppModule[] = [
  initFromTemplate,
  checkLastCommit,
  addTemplate,
  applyTemplate,
  refreshTree,
  openSettings,
  runAllChecks,
  runCheck,
  refreshChecks,
  revealChecksFolder,
  scaffoldDefaultChecks,
  showCheckOutput
];
```

---

## Task 11: Wire `extension.ts`

**Files:**
- Modify: `vibecode-commit-lint-check/src/extension.ts`

Replaces the previous file entirely. Keeps templates view + new checks wiring + the six new command implementations.

- [ ] **Step 11.1: Replace `extension.ts`**

```ts
import * as vscode from 'vscode';
import { apps } from './apps';
import { fullCommandId } from './apps/_types';
import { TemplateTreeProvider, VIEW_ID } from './treeProvider';
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

  // Templates view (existing).
  const templates = new TemplateTreeProvider();
  context.subscriptions.push(
    vscode.window.createTreeView(VIEW_ID, { treeDataProvider: templates, showCollapseAll: true })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('vibecodeCommitLint.refreshTree', () => templates.refresh())
  );
  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders(() => templates.refresh())
  );
  const templatesWatcher = vscode.workspace.createFileSystemWatcher(
    '**/commit-lint-templates/**/template.json'
  );
  context.subscriptions.push(
    templatesWatcher,
    templatesWatcher.onDidCreate(() => templates.refresh()),
    templatesWatcher.onDidChange(() => templates.refresh()),
    templatesWatcher.onDidDelete(() => templates.refresh())
  );

  // Checks view (new).
  const checksState = new ChecksState();
  const checks = new ChecksTreeProvider(checksState);
  context.subscriptions.push(checksState);
  context.subscriptions.push(
    vscode.window.createTreeView(CHECKS_VIEW_ID, { treeDataProvider: checks })
  );
  await checks.refresh();

  context.subscriptions.push(
    vscode.commands.registerCommand('vibecodeCommitLint.refreshChecks', () => checks.refresh())
  );
  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders(() => checks.refresh())
  );
  const checksWatcher = vscode.workspace.createFileSystemWatcher(
    '**/.vibecode/code-lint/**/check.json'
  );
  context.subscriptions.push(
    checksWatcher,
    checksWatcher.onDidCreate(() => checks.refresh()),
    checksWatcher.onDidChange(() => checks.refresh()),
    checksWatcher.onDidDelete(() => checks.refresh())
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('vibecodeCommitLint.runCheck', async (idArg: unknown) => {
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
    vscode.commands.registerCommand('vibecodeCommitLint.runAllChecks', async () => {
      const ws = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!ws) return;
      const entries = checks.getEntries().filter((e): e is CheckEntry & { parsed: { ok: true } } => e.parsed.ok);
      for (const entry of entries) await runOne(entry, ws, checksState);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('vibecodeCommitLint.revealChecksFolder', async () => {
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
    vscode.commands.registerCommand('vibecodeCommitLint.scaffoldDefaultChecks', async () => {
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
    vscode.commands.registerCommand('vibecodeCommitLint.showCheckOutput', () => {
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

export function deactivate(): void {
  // nothing to do — subscriptions are disposed by VSCode
}
```

---

## Task 12: Update `package.json` (views + activation events)

**Files:**
- Modify: `vibecode-commit-lint-check/package.json`

The sync script regenerates `contributes.commands` and `contributes.menus` but leaves `views`, `viewsContainers`, `activationEvents`, and `configuration` alone — so we edit those by hand.

- [ ] **Step 12.1: Update `activationEvents`**

Replace lines 16–18:

```json
"activationEvents": [
  "onStartupFinished"
],
```

with:

```json
"activationEvents": [
  "onStartupFinished",
  "onView:vibecodeCommitLint.checks",
  "onView:vibecodeCommitLint.templates"
],
```

- [ ] **Step 12.2: Update `contributes.views`**

Replace the `views` block (currently lines 61–69) with:

```json
"views": {
  "vibecodeCommitLint": [
    {
      "id": "vibecodeCommitLint.checks",
      "name": "%view.checks.name%",
      "type": "tree"
    },
    {
      "id": "vibecodeCommitLint.templates",
      "name": "%view.templates.name%",
      "type": "tree"
    }
  ]
},
```

(After Task 13's sync run, the `commands` and `menus` blocks below will be regenerated — leave them as-is here; the sync step rewrites them.)

---

## Task 13: i18n — runtime strings + view label

**Files:**
- Modify: `vibecode-commit-lint-check/i18n/ko.json`

- [ ] **Step 13.1: Add view label, command titles, runtime strings**

In `i18n/ko.json`:

1. Inside the `view` block, add a `checks` entry next to `templates`:

```json
"view": {
  "container": { "title": "커밋 린트" },
  "checks": { "name": "체크" },
  "templates": { "name": "템플릿" }
},
```

2. Inside the `commands` block, append:

```json
"runAllChecks": "바이브코드 - 전체 커밋 린트 체크 실행",
"runCheck": "바이브코드 - 커밋 린트 체크 실행",
"refreshChecks": "바이브코드 - 커밋 린트 체크 새로고침",
"revealChecksFolder": "바이브코드 - 커밋 린트 체크 폴더 열기",
"scaffoldDefaultChecks": "바이브코드 - 기본 커밋 린트 체크 생성",
"showCheckOutput": "바이브코드 - 커밋 린트 체크 출력 보기"
```

3. Inside the `runtime` block, append:

```json
"Click to scaffold default checks": "기본 체크를 생성하려면 클릭하세요",
"parse error": "구문 오류",
"Show Last Output": "마지막 출력 보기",
"Scaffolded {0} default check(s).": "기본 체크 {0}개를 생성했습니다.",
"Default checks already present.": "기본 체크가 이미 존재합니다."
```

(Note: `"No workspace folder open."` already exists in the runtime block — no duplicate.)

---

## Task 14: Sync + typecheck + lint

**Files:** none (build pipeline)

- [ ] **Step 14.1: Run sync**

```bash
cd vibecode-commit-lint-check && npm run sync
```

Expected: log line "Synced 12 apps -> 12 commands, N menus, 1 locales (ko)." (was 6 apps before.)

This regenerates `package.json#contributes.commands` and `contributes.menus`, `package.nls.json` (adds `cmd.runAllChecks` etc.), `package.nls.ko.json`, and `l10n/bundle.l10n.ko.json`.

- [ ] **Step 14.2: Run typecheck**

```bash
cd vibecode-commit-lint-check && npm run typecheck
```

Expected: exit 0, no errors.

- [ ] **Step 14.3: Run lint**

```bash
cd vibecode-commit-lint-check && npm run lint
```

Expected: exit 0.

If lint flags `no-unused-vars` on our new files, fix at the call site (no `--fix` shortcut for `no-unused-vars`).

- [ ] **Step 14.4: Add `view.checks.name` to `package.nls.json` (English)**

The sync script forwards `view.checks.name` from `i18n/ko.json` into `package.nls.ko.json`, but the English `package.nls.json` is hand-edited (built from `scripts/nls-defaults.json` + manifest titles). Confirm the English file contains `"view.checks.name": "Checks"` — if not, add it to `scripts/nls-defaults.json`:

```json
{
  "ext.displayName": "Vibecode Commit Lint Check",
  ...
  "view.container.title": "Commit Lint",
  "view.checks.name": "Checks",
  "view.templates.name": "Templates",
  ...
}
```

Re-run `npm run sync` after editing `nls-defaults.json`.

---

## Task 15: Build the extension

- [ ] **Step 15.1: Build**

```bash
cd vibecode-commit-lint-check && npm run build
```

Expected: exit 0. `dist/` now contains `checks/`, `apps/run-all-checks/`, etc.

---

## Task 16: Manual smoke test (matches spec §Testing)

These are manual — execute in a development VSCode window (`F5` from the extension folder, or install the vsix).

- [ ] **Step 16.1: Fresh-state activation**
  - Open a workspace **without** `.vibecode/code-lint/`.
  - Click the "Commit Lint" activity bar icon.
  - Expect: Checks view shows a single "💡 Click to scaffold default checks" row. No "데이터 공급자 없음" flash.

- [ ] **Step 16.2: Scaffold**
  - Click the scaffold row.
  - Expect: 4 default checks appear; `.vibecode/code-lint/{010,020,030,040}-*/check.json` exist.

- [ ] **Step 16.3: Run All — pass case**
  - Make a clean conventional commit: `git commit --allow-empty -m "chore: test"`.
  - Click the `Run All Checks` (▶) button on the view title.
  - Expect: 010/020/030 turn green; 040 turns green if commitlint is reachable (otherwise red — acceptable).

- [ ] **Step 16.4: Run All — fail case**
  - `git commit --amend -m "BAD subject without prefix and way way way way way way way way way way way longer than seventy two characters total"`.
  - Click `Run All Checks`.
  - Expect: 010 (length) red, 020 (prefix) red, 030 green.

- [ ] **Step 16.5: Click row → output**
  - Click a red row.
  - Expect: "Vibecode Commit Lint" output panel opens with the last run's stdout/stderr.

- [ ] **Step 16.6: Refresh after edit**
  - Edit `.vibecode/code-lint/010-subject-length/check.json` — change `label` to `"Subject ≤ 72 (edited)"`.
  - Click `Refresh Checks` (↻).
  - Expect: the row label updates.

- [ ] **Step 16.7: Delete folder**
  - `rm -rf .vibecode/code-lint/`.
  - Click `Refresh Checks`.
  - Expect: scaffold-prompt row returns.

- [ ] **Step 16.8: Malformed JSON**
  - Create `.vibecode/code-lint/099-broken/check.json` with `{ "command": }`.
  - Click `Refresh Checks`.
  - Expect: a `099-broken` row with warning icon, tooltip shows JSON parse error.

If any step fails, fix and re-run typecheck + smoke before moving on.

---

## Task 17: Bundle commit

**Files:** all changes from this session.

- [ ] **Step 17.1: Verify tree state**

```bash
cd /Users/jeonghan/Documents/WORK/WORKSPACE/apps/vscode-extension-mono && git status
```

Expected new/modified files:
- New: `docs/superpowers/specs/2026-05-25-commit-lint-checks-design.md` (already committed in `500e085`)
- New: `docs/superpowers/plans/2026-05-25-commit-lint-checks.md`
- New: `vibecode-commit-lint-check/bundled-checks/...`
- New: `vibecode-commit-lint-check/src/checks/...`
- New: `vibecode-commit-lint-check/src/apps/{run-all-checks,run-check,refresh-checks,reveal-checks-folder,scaffold-default-checks,show-check-output}/...`
- Modified: `vibecode-commit-lint-check/src/apps/index.ts`
- Modified: `vibecode-commit-lint-check/src/extension.ts`
- Modified: `vibecode-commit-lint-check/package.json`
- Modified: `vibecode-commit-lint-check/package.nls.json`
- Modified: `vibecode-commit-lint-check/package.nls.ko.json`
- Modified: `vibecode-commit-lint-check/i18n/ko.json`
- Modified: `vibecode-commit-lint-check/l10n/bundle.l10n.ko.json`
- Modified: `vibecode-commit-lint-check/scripts/nls-defaults.json` (if Step 14.4 needed edits)

- [ ] **Step 17.2: One bundled commit**

```bash
git add docs/superpowers/plans/2026-05-25-commit-lint-checks.md vibecode-commit-lint-check/
git commit -m "$(cat <<'EOF'
feat(commit-lint-check): folder-driven Checks sidebar view

Add a second view "Checks" to the activity bar that reads
.vibecode/code-lint/<NNN-name>/check.json from the workspace,
runs each via shell exec on demand, and shows pass/fail in the tree.
Ships 4 bundled default checks (subject length, type prefix,
blank line after subject, commitlint on HEAD) scaffoldable on
empty state. Adds onView activation to remove the "no data provider"
flash on first open.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review

Skim against the spec:

- ✅ Spec §"Source of Truth" → Task 1 (seed dirs match `010-`, `020-`, `030-`, `040-` naming).
- ✅ Spec §"`check.json` Schema" → Task 3 enforces required `command`, optional `label/description/expectExit/cwd/shell`, default `expectExit=0/cwd=./shell=true`, rejects escape via `..`.
- ✅ Spec §"Sidebar View" → Task 12 places `checks` first; Task 8 renders flat list with state icons, scaffold-prompt empty state, warning icon for parse errors.
- ✅ Spec §"Activation" → Task 12 adds both `onView:` events.
- ✅ Spec §"Commands" → Task 9 creates all six commands; Task 11 implements them in `extension.ts`.
- ✅ Spec §"Output channel" → Task 4 (singleton) + Task 5 (timestamp/command/exit lines).
- ✅ Spec §"Bundled defaults" → Task 1 (4 checks) + Task 7 (copy on demand).
- ✅ Spec §"Module layout" → Tasks 2–8 create `src/checks/*`; Task 9 creates `apps/<command>/*`.
- ✅ Spec §"i18n" → Task 13 (Korean) + Task 14.4 (English fallback).
- ✅ Spec §"Edge cases" → loader rejects empty `command`/non-string `cwd`/escape; runner handles `spawn error` separately from non-zero exit; sequential run via `for await` in `runAllChecks`.
- ✅ Spec §"Testing" → Task 16 mirrors all seven manual steps.

No placeholders. Type signatures consistent (`CheckEntry`, `CheckState`, `ChecksNode` defined once, used by name across tasks). Folder names match between manifest `id` strings and runtime command IDs (`vibecodeCommitLint.<camelCaseId>`).
