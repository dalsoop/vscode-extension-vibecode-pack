# Commit-Lint Checks — Folder-Driven Check System

Status: draft
Owner: vibecode-commit-lint-check
Date: 2026-05-25

## Problem

The `vibecode-commit-lint-check` activity bar currently shows one tree view (`Templates`). Before the extension activates (`activationEvents: onStartupFinished`), VSCode renders the built-in "데이터를 제공할 수 있는 등록된 데이터 공급자가 없습니다" message because no `TreeDataProvider` is wired yet. There is also no surface in the sidebar that actually *checks* anything — the only check action (`checkLastCommit`) is a terminal command. Users have nowhere to see "what passes / what fails" at a glance.

## Goal

Add a second sidebar view, `Checks`, that reads a flat folder of declarative check definitions from the user's workspace and runs them on demand, showing pass/fail per row. Eliminate the no-provider message by activating on view focus and rendering an actionable empty state.

Make the check authoring model brute-force simple: one folder per check, one `check.json` inside it, exit-code-based pass/fail.

## Non-Goals

- No auto-run on commit / file watch (deferred).
- No rich rule DSL — just a shell command.
- No multi-category nesting (flat only).
- No problems-panel integration (deferred).

## Source of Truth

`<workspaceRoot>/.vibecode/code-lint/` — folder name `code-lint` (not `commit-lint`) so future code-style/quality checks can live alongside commit checks without another folder.

```
<workspaceRoot>/.vibecode/code-lint/
├── 010-subject-length/
│   └── check.json
├── 020-subject-type-prefix/
│   └── check.json
└── 030-commitlint-run/
    └── check.json
```

Each immediate subdirectory of `.vibecode/code-lint/` containing a `check.json` is one check. Sort order = lexicographic folder name (so `NNN-` prefix is the convention).

## `check.json` Schema

```json
{
  "label": "Subject ≤ 72 chars",
  "description": "First line of HEAD commit fits in 72 chars",
  "command": "test $(git log -1 --pretty=%s | wc -c) -le 73",
  "expectExit": 0,
  "cwd": ".",
  "shell": true
}
```

- `command` (string) — required. Shell command run via the extension host's `child_process.exec` (or `spawn` with `shell: true`).
- `label` (string) — optional. Defaults to the folder name with the leading `NNN-` stripped.
- `description` (string) — optional. Shown as tree item description (dim text) and in tooltip.
- `expectExit` (number) — optional, default `0`. Pass if exit code matches.
- `cwd` (string) — optional, default `.`. Resolved against the workspace folder root. Must stay inside the workspace (reject paths that escape via `..`).
- `shell` (boolean) — optional, default `true`. If `false`, `command` is split with shell-quote rules and exec'd directly.

Unknown keys are ignored (forward compat).

Validation failures (missing `command`, malformed JSON) → the check appears in the tree with a warning icon and the parse error in its tooltip; `Run` is disabled.

## Sidebar View

Activity bar container `vibecodeCommitLint` already exists. Add a second view:

```jsonc
"views": {
  "vibecodeCommitLint": [
    { "id": "vibecodeCommitLint.checks",    "name": "Checks",    "type": "tree" },
    { "id": "vibecodeCommitLint.templates", "name": "Templates", "type": "tree" }
  ]
}
```

Order: `Checks` first (primary surface), `Templates` second (existing scaffolding).

### Tree shape

Flat list. Each node = one check. Node columns:

- Icon: state (see below).
- Label: `check.json#label` (or derived from folder name).
- Description (right-aligned dim): `check.json#description` truncated.

### State icons

| State       | Icon (`ThemeIcon`)        | Color hint                  |
|-------------|---------------------------|-----------------------------|
| Idle        | `circle-large-outline`    | default                     |
| Running     | `sync~spin`               | default                     |
| Pass        | `pass`                    | `charts.green`              |
| Fail        | `error`                   | `errorForeground`           |
| Parse error | `warning`                 | `editorWarning.foreground`  |

State is in-memory only; not persisted across reloads.

### Empty / missing folder state

If `.vibecode/code-lint/` is absent or contains zero valid check folders, the tree renders a single actionable node:

> 💡 Click to scaffold default checks

Clicking runs `vibecodeCommitLint.scaffoldDefaultChecks` (see Commands).

## Activation

Add to `activationEvents`:

```
"onView:vibecodeCommitLint.checks",
"onView:vibecodeCommitLint.templates"
```

(Keep `onStartupFinished` for the existing commands.) This is what makes the "데이터 공급자가 없습니다" flash disappear — VSCode activates the extension the moment either view becomes visible.

## Commands

New:

| Command id                                    | Title (en)                          | Shown in                          |
|-----------------------------------------------|-------------------------------------|-----------------------------------|
| `vibecodeCommitLint.runAllChecks`             | Run All Checks                      | `view/title` (checks), palette    |
| `vibecodeCommitLint.runCheck`                 | Run Check                           | `view/item/context` (checks)      |
| `vibecodeCommitLint.refreshChecks`            | Refresh Checks                      | `view/title` (checks), palette    |
| `vibecodeCommitLint.revealChecksFolder`       | Reveal Checks Folder                | `view/title` (checks), palette    |
| `vibecodeCommitLint.scaffoldDefaultChecks`    | Scaffold Default Checks             | empty-state node, palette         |
| `vibecodeCommitLint.showCheckOutput`          | Show Last Output (internal)         | node click                        |

`view/title` button order for the Checks view: `runAllChecks` ▶, `refreshChecks` ↻, `revealChecksFolder` 📁, then existing settings (`@9`).

Per-node click behavior: invoke `showCheckOutput`, which opens and focuses the shared output channel. If the check has never run, the channel is just empty/header — that's fine; users start a run from the title-bar `Run All` button or via right-click → `Run Check`. No auto-run on click ("brute-force explicit").

## Output channel

One shared `OutputChannel`: `"Vibecode Commit Lint"`. Each run emits:

```
[2026-05-25 13:22:14] ▶ 010-subject-length
$ test $(git log -1 --pretty=%s | wc -c) -le 73
   (stdout/stderr)
✓ exit 0 (12ms)
```

Tooltip on a failed node = first line of stderr (or stdout if stderr empty), truncated.

## Bundled defaults

Ship in the extension under `bundled-checks/` (separate from existing `templates/` which scaffolds commitlint configs — different concern):

```
bundled-checks/
├── 010-subject-length/check.json
├── 020-subject-type-prefix/check.json
├── 030-body-blank-line-after-subject/check.json
└── 040-commitlint-run/check.json
```

Concrete commands:

- `010-subject-length` — `git log -1 --pretty=%s | awk '{exit (length>72)}'`
- `020-subject-type-prefix` — `git log -1 --pretty=%s | grep -qE '^(feat|fix|chore|docs|refactor|test|build|ci|perf|style|revert)(\(.+\))?!?: '`
- `030-body-blank-line-after-subject` — `git log -1 --pretty=%B | awk 'NR==2 && NF{exit 1} END{exit 0}'`
- `040-commitlint-run` — `npx --yes commitlint --from HEAD~1 --to HEAD`

`scaffoldDefaultChecks` copies these into `<workspaceRoot>/.vibecode/code-lint/`. Existing folders of the same name are skipped (no overwrite). After copy, reveal the folder and refresh the tree.

## Module layout (apps-pattern)

Follow the established `apps/<command>/` pattern. New folders:

```
src/
├── apps/
│   ├── run-all-checks/
│   ├── run-check/
│   ├── refresh-checks/
│   ├── reveal-checks-folder/
│   ├── scaffold-default-checks/
│   └── show-check-output/
├── checks/                          # new: check engine
│   ├── checkLoader.ts               # scan .vibecode/code-lint/, parse check.json
│   ├── checkRunner.ts               # exec command, capture exit/stdout/stderr
│   ├── checksTreeProvider.ts        # TreeDataProvider for Checks view
│   ├── checksState.ts               # in-memory state map (id → {state, lastRun})
│   └── outputChannel.ts             # singleton OutputChannel
└── extension.ts                     # wires both providers + activation events
```

`treeProvider.ts` (existing Templates provider) stays put.

`apps/index.ts` adds the six new modules to the `apps` array.

`bundled-checks/` sits at the extension root next to `templates/`. `scripts/sync-contributions.mjs` should be unchanged (it generates `package.json#contributes` from `apps/*/manifest.ts`); confirm during implementation.

## i18n

New keys in both `package.nls.json` (en) and `package.nls.ko.json`:

- `view.checks.name` — "Checks" / "체크"
- `cmd.runAllChecks` — "Run All Checks" / "전체 체크 실행"
- `cmd.runCheck` — "Run Check" / "체크 실행"
- `cmd.refreshChecks` — "Refresh Checks" / "체크 새로고침"
- `cmd.revealChecksFolder` — "Reveal Checks Folder" / "체크 폴더 열기"
- `cmd.scaffoldDefaultChecks` — "Scaffold Default Checks" / "기본 체크 생성"

Bundle-side l10n: tree messages ("Click to scaffold default checks", empty state, parse error labels) go through `vscode.l10n.t` with mirror entries in `i18n/ko.json`.

## Edge cases

- **No git repo / no commits** — checks that shell out to `git log` will exit non-zero. Render as Fail with the shell's stderr; not the extension's job to special-case.
- **Workspace with multiple folders** — use `workspaceFolders[0]` (same convention as existing Templates view). Document this limitation.
- **`check.json` with `command: ""`** — treat as parse error.
- **`cwd` escapes workspace (`../../`)** — reject, render as parse error.
- **Long-running command** — no timeout in v1; user can re-click `Run` if they don't want to wait. Add timeout in v2 if it bites.
- **`Run All` while individual `Run` is mid-flight** — queue; each check runs sequentially to keep output channel readable.

## Risk / open questions

- `npx --yes commitlint` in the default `040` check requires network on first run. Documented in the check's `description`. If this is annoying we can drop it from the bundled defaults — it's already covered by the existing `checkLastCommit` command.
- `bundled-checks/` needs to be included in the `.vsix`. Verify `.vscodeignore` / `package.json#files` doesn't exclude it.

## Testing (manual)

1. Fresh install in a workspace with no `.vibecode/code-lint/` → Checks view shows scaffold prompt; no "no data provider" flash on activity bar click.
2. Click scaffold → 4 default checks appear.
3. `Run All` → green/red icons match expected (use a known-good commit to verify ✓, amend with `git commit --amend -m "bad"` to verify ✗).
4. Click a failed node → output panel opens at the run log.
5. Edit a `check.json` → click Refresh → label updates.
6. Delete `.vibecode/code-lint/` → Refresh → returns to scaffold prompt.
7. Add a check with malformed JSON → warning icon, tooltip shows parse error.
