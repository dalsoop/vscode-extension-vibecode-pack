# Vibecode Show File Lines

A VSCode sidebar that ranks every file in your workspace by line count, so you can spot refactor targets at a glance.

> Activity Bar → **Vibecode File Lines** → `Line Ranking`.

## Why

Some files quietly grow until they're 2,000-line monsters nobody wants to touch. There's no built-in "show me the biggest files" view in VSCode — `find` works but doesn't filter binaries, respect `.gitignore`, or stay live. This extension does.

## Features

- **Flat ranking** — top-N files sorted by line count (descending).
- **Group-by-extension** view — switch to see which file types contribute most.
- **Threshold highlighting** — files above `warnThreshold` get a visual warning marker so over-long files stand out at a glance.
- **Respects ignore files** — `.gitignore`, `.lineignore`, and `files.exclude` (each toggleable).
- **Binary skip** — known binary extensions are never opened; extras configurable.
- **Size cap** — files larger than `maxFileSizeKB` are skipped without being read.
- **Live re-scan** — refresh from the toolbar at any time.

## Commands

| Command | What it does |
|---|---|
| `Vibecode - Refresh Line Ranking` | Re-scan workspace and rebuild the tree |
| `Vibecode - Toggle Line Ranking View Mode` | Switch between flat ranking and group-by-extension |
| `Vibecode - Open Line Ranking Settings` | Jump to the Settings UI filtered to this extension |

## Settings

All settings live under `vibecodeShowFileLines.*` — open Settings UI and filter by that prefix.

| Key | Default | Description |
|---|---|---|
| `topN` | `50` | Maximum files shown in the flat ranking |
| `warnThreshold` | `500` | Files at or above this line count are visually highlighted |
| `maxFileSizeKB` | `2048` | Files larger than this are skipped without reading |
| `respectGitignore` | `true` | Apply `.gitignore` rules when scanning |
| `respectFilesExclude` | `true` | Apply `files.exclude` rules when scanning |
| `defaultGrouping` | `flat` | Initial view mode: `flat` or `grouped` |
| `additionalBinaryExtensions` | `[]` | Extra extensions to treat as binary (e.g. `[".bin", ".dat"]`) |

## How it works

A workspace scan walks every file VSCode's `findFiles` API returns (respecting your ignore configuration), opens each in a streaming line counter, and emits a sorted tree. The scan is incremental and re-runs only when you invoke **Refresh** — saving a file does not trigger a rescan, so the view doesn't churn during normal editing. Binary detection is filename-based (extension allow-list) rather than content-based for speed.

## Development

```bash
npm install
npm run build       # esbuild bundle into dist/extension.js
npm test            # vitest unit tests
npm run package     # produce .vsix
```

## License

MIT — see [LICENSE](LICENSE).
