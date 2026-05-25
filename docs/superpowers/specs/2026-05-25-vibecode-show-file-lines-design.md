# vibecode-show-file-lines — Design Spec

- **Date**: 2026-05-25
- **Status**: Draft v2 (approved for implementation planning)
- **Scope**: VSCode extension `vibecode-show-file-lines`, v0.1.0

## 1. Purpose

Surface refactoring targets by ranking workspace files by line count in a dedicated sidebar tree view. The extension is read-only — it does not modify files; it helps the user find files that are too long.

## 2. Non-Goals (v0.1)

The following are explicitly **out of scope** for v0.1 and must not be implemented:

- Webview-based statistics dashboards, charts, or visualizations
- SLOC / comment-ratio / cyclomatic complexity analysis
- Persistent (on-disk) cache
- Multi-workspace comparison
- Inline status-bar line counters on the active editor
- Modification of any source file

These are recorded so future maintainers know they were deliberately excluded, not forgotten.

## 3. User-Facing Surface

### 3.1 Activity Bar
- One dedicated Activity Bar icon opens the `Show File Lines` view container.

### 3.2 Sidebar Tree View
- **Default mode**: flat list of all non-ignored files sorted by line count descending, limited to `topN` (default 100).
- **Alternate mode**: grouped by file extension; group header shows file count and total lines; each group is internally sorted by lines descending.
- Node label format: `<lines>  <relative/path/to/file.ext>`.
- Files exceeding `warnThreshold` (default 500) are visually emphasized (icon + theme color).
- Clicking a node opens the file in the editor.

### 3.3 Title Bar Actions
- Refresh (re-scan)
- Toggle view mode (flat ↔ grouped)
- Open settings (filters Settings UI to this extension's namespace)

## 4. Scan & Ignore Rules

Three ignore sources are merged. A file is ignored if **any** active source ignores it.

| Priority | Source | Toggle |
|---:|---|---|
| 1 | `.lineignore` at workspace root (gitignore syntax) | always on |
| 2 | `.gitignore` (workspace + ancestor directories, standard git semantics) | `respectGitignore` (default `true`) |
| 3 | VSCode `files.exclude` (workspace + user settings) | `respectFilesExclude` (default `true`) |

`.lineignore` is always evaluated; it is the extension's first-class override mechanism.

## 5. Line Count Semantics (v0.1)

- **Definition**: count of `\n` bytes in the file, plus 1 if the file is non-empty and does not end in `\n`. (Equivalent to "number of lines a human sees".)
- **Binary skip**: file is skipped if any of:
  - extension is in `DEFAULT_BINARY_EXTS` (constants) **or** user's `additionalBinaryExtensions` setting,
  - **or** the first 2 KB of content contains a null byte.
- **Size cap**: files larger than `maxFileSizeKB` (default 5120) are skipped without reading.

Skipped files do not appear in the tree.

## 6. Performance & Lifecycle

- **Activation event**: `onStartupFinished` (matches sibling extensions).
- **Initial scan**: streamed in the background; status-bar progress (`Scanning N / M files…`).
- **Cache**: in-memory `Map<uriString, FileStat>`.
- **Incremental updates**: a single `vscode.workspace.createFileSystemWatcher('**/*')` with a 250 ms debounce.
  - `create` / `change` → re-count if not ignored / not over size cap.
  - `delete` → remove from cache.
- **Ignore source changes**: when `.lineignore`, `.gitignore`, or relevant `files.exclude` settings change, the resolver reloads and the tree refreshes.
- **Config changes**: configuration listener triggers re-evaluation of affected settings (e.g., changing `topN` re-renders only; changing `maxFileSizeKB` triggers a full re-scan).

## 7. Architecture

### 7.1 Layering

```
┌─────────────────────────────────────────────────┐
│ extension.ts  (composition root, vscode-aware)  │
├─────────────────────────────────────────────────┤
│ adapters/  (vscode → 도메인 어댑터)             │
├─────────────────────────────────────────────────┤
│ core/  (도메인, vscode import 금지)             │
├─────────────────────────────────────────────────┤
│ view/  (vscode TreeView 통합)                   │
├─────────────────────────────────────────────────┤
│ constants.ts (불변) + l10n (UI 문자열)          │
└─────────────────────────────────────────────────┘
```

### 7.2 Design Principles

1. **All constants in one place.** No magic numbers/strings in business logic. `constants.ts` holds invariants (IDs, default seed data); settings hold runtime-tunable values.
2. **VSCode API behind adapters.** No `core/*` file may `import * as vscode from 'vscode'`. All vscode surface area is wrapped by an adapter that implements a domain-defined interface.
3. **Policies are interfaces.** Sorting, grouping, binary detection, ignore sources, and line counting are all interfaces with registry-based wiring. Adding a new policy means adding a file and one registration line — no edits to consumers.
4. **One composition root.** Only `extension.ts` instantiates concrete classes. All other modules depend on interfaces.

### 7.3 Core Interfaces

Defined in `core/types.ts`. Adapters and concrete implementations target these.

```ts
// ── Adapter boundary (implemented in adapters/) ───────────────────
interface IFileSystem {
  readFile(uri: Uri): Promise<Uint8Array>;
  stat(uri: Uri): Promise<{ size: number; mtime: number }>;
  findFiles(include: string, exclude?: string): AsyncIterable<Uri>;
}
interface IConfigProvider {
  get<T>(key: string, fallback: T): T;
  onChange(keys: string[], cb: () => void): Disposable;
}
interface IFileWatcher {
  watch(glob: string): {
    onCreate(cb: (uri: Uri) => void): Disposable;
    onChange(cb: (uri: Uri) => void): Disposable;
    onDelete(cb: (uri: Uri) => void): Disposable;
    dispose(): void;
  };
}
interface ILogger {
  debug(msg: string, meta?: object): void;
  info(msg: string, meta?: object): void;
  warn(msg: string, meta?: object): void;
  error(msg: string, meta?: object): void;
}

// ── Domain policies (extension points) ────────────────────────────
interface ILineCountStrategy {
  readonly id: string;            // e.g. 'raw-newline'
  count(content: Uint8Array): number;
}
interface IBinaryDetector {
  isBinary(uri: Uri, sample: Uint8Array): boolean;
}
interface IIgnoreSource {
  readonly id: string;            // e.g. 'gitignore'
  readonly priority: number;      // lower = applied first
  loadRules(): Promise<IgnoreRule[]>;
  watch?(onChange: () => void): Disposable;
}
interface IIgnoreResolver {
  isIgnored(uri: Uri): boolean;
  reload(): Promise<void>;
}

// ── Cache ─────────────────────────────────────────────────────────
interface FileStat {
  uri: Uri;
  ext: string;
  lines: number;
  size: number;
  mtime: number;
}
interface CacheChange {
  added: FileStat[];
  updated: FileStat[];
  removed: Uri[];
}
interface ILineCache {
  get(uri: Uri): FileStat | undefined;
  upsert(uri: Uri, stat: FileStat): void;
  remove(uri: Uri): void;
  all(): Iterable<FileStat>;
  onChange(cb: (changes: CacheChange) => void): Disposable;
}

// ── View strategies (extension points) ────────────────────────────
interface ViewCtx {
  topN: number;
  warnThreshold: number;
}
interface ITreeViewMode {
  readonly id: string;            // 'flat-by-lines' | 'group-by-ext'
  readonly label: string;         // l10n key, resolved at render time
  build(stats: Iterable<FileStat>, ctx: ViewCtx): TreeNode[];
}
```

### 7.4 Constants vs Settings

| Kind | Location | Examples |
|---|---|---|
| Extension/command/view IDs, config namespace | `constants.ts` | `EXTENSION_ID`, `CMD_REFRESH`, `VIEW_ID` |
| Seed lists (default binary extensions) | `constants.ts` | `DEFAULT_BINARY_EXTS` |
| Runtime-tunable values | settings, read via `IConfigProvider` | `topN`, `warnThreshold`, `maxFileSizeKB`, `respectGitignore`, `respectFilesExclude`, `defaultGrouping`, `additionalBinaryExtensions` |
| UI strings | `l10n/bundle.l10n.{json,ko.json}` | view labels, status messages |
| Policy registration | `extension.ts` only | `registry.registerViewMode(new FlatByLines())` |

**Review-time bans:**
- Literal strings or numbers inside `core/*` or `view/*` files (other than `constants` re-exports).
- `import * as vscode from 'vscode'` anywhere under `core/`.
- Hardcoded extension-list branches in detection logic (must read from constants + settings).

### 7.5 File Layout

```
vibecode-show-file-lines/
  package.json
  package.nls.json
  package.nls.ko.json
  l10n/
    bundle.l10n.json
    bundle.l10n.ko.json
  scripts/
    sync-contributions.mjs
  src/
    constants.ts
    extension.ts
    adapters/
      vscodeFileSystem.ts
      vscodeConfig.ts
      vscodeWatcher.ts
      vscodeLogger.ts
    core/
      types.ts
      registry.ts
      scanner.ts
      cache.ts
      ignoreResolver.ts
      ignoreSources/
        gitignoreSource.ts
        lineignoreSource.ts
        filesExcludeSource.ts
      lineCounters/
        rawNewlineCounter.ts
      binaryDetectors/
        extensionAndNullByteDetector.ts
    view/
      lineTreeProvider.ts
      viewModes/
        flatByLines.ts
        groupByExtension.ts
  tests/
    core/
      scanner.test.ts
      ignoreResolver.test.ts
      cache.test.ts
      rawNewlineCounter.test.ts
      extensionAndNullByteDetector.test.ts
    view/
      flatByLines.test.ts
      groupByExtension.test.ts
  tsconfig.json
  eslint.config.mjs
  README.md
```

## 8. Settings Schema

Namespace: `vibecodeShowFileLines.*`.

| Key | Type | Default | Notes |
|---|---|---:|---|
| `topN` | number | 100 | Max nodes in flat view |
| `warnThreshold` | number | 500 | Emphasize files at/above this line count |
| `maxFileSizeKB` | number | 5120 | Files above this are skipped without read |
| `respectGitignore` | boolean | true | Honor `.gitignore` |
| `respectFilesExclude` | boolean | true | Honor `files.exclude` |
| `defaultGrouping` | enum(`flat`, `byExtension`) | `flat` | Initial view mode |
| `additionalBinaryExtensions` | string[] | `[]` | Appended to `DEFAULT_BINARY_EXTS` |

## 9. Testing Strategy

- **Core unit tests** mock `IFileSystem`, `IConfigProvider`, `IFileWatcher`, `ILogger` — no vscode import needed.
- **Coverage targets**:
  - `lineCounters/rawNewlineCounter`: empty file, no trailing newline, only newlines, large file.
  - `binaryDetectors/extensionAndNullByteDetector`: known binary ext, unknown ext with null byte, text file.
  - `ignoreResolver`: precedence between sources, source reload, overlapping rules.
  - `cache`: upsert, remove, change events.
  - `scanner`: ignored file is skipped, oversized file is skipped, binary file is skipped.
  - `viewModes/*`: sort order, group counts, topN truncation.
- **Adapters** are thin and exercised manually in the host; no automated tests required for v0.1.

## 10. Open Items

None. v0.1 scope is fully constrained.

## 11. Reference: Sibling Extension Conventions

Patterns to mirror (observed in `vibecode-agent-init-this-folder`, `vibecode-env-import-only`, `vibecode-right-click-sh-actions`):

- Publisher: `dalsoop`
- VSCode engine: `^1.95.0`
- Activation: `onStartupFinished`
- Localization: `package.nls.json` + `package.nls.ko.json`, runtime `l10n/`
- Scripts: `scripts/sync-contributions.mjs` for keeping `package.json.contributes` consistent
- Build: `tsc -p .` into `dist/`, packaged via `@vscode/vsce`
