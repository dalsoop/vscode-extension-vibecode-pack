# Vibecode Right-Click VSIX Package & Install

Right-click a VSCode extension folder in the Explorer to package it as a `.vsix` and install it into your running VSCode — in one shot.

> Useful for monorepos where you're iterating on an extension and need to repeatedly try it in your live VSCode without copying paths around.

## What it does

When you right-click a folder and pick **Vibecode - Package & Install VSCode Extension**, the extension:

1. Verifies the selected folder is a VSCode extension (must have a `package.json` with an `engines.vscode` field).
2. Opens an integrated terminal at that folder.
3. Runs (idempotent):
   - `npm install --silent` — in case dependencies aren't installed
   - `npm run package` (or falls back to `npx vsce package --no-dependencies --allow-missing-repository` if no `package` script is defined)
   - `code --install-extension <name>-<version>.vsix --force` — installs into the currently running VSCode

The full output is streamed to the terminal. If any step fails, the chain stops there and the error is visible — nothing is hidden.

## Commands

| Command | Trigger | What it does |
|---|---|---|
| `Vibecode - Package & Install VSCode Extension` | Right-click a folder in the Explorer | Runs the package + install sequence above |

## Quick start

1. Install the extension.
2. In the Explorer, right-click any VSCode extension folder.
3. Pick **Vibecode - Package & Install VSCode Extension**.
4. Watch the terminal output. On success, VSCode prompts you to reload the window so the freshly installed extension takes effect.

## Requirements

- **`code` CLI on `PATH`** — Command Palette → "Shell Command: Install 'code' command in PATH" (one-time setup).
- **bash / zsh terminal** — default on macOS / Linux. Windows PowerShell support is not yet implemented; on Windows use WSL or Git Bash.
- **`vsce`** — installed via `npm i -g @vscode/vsce` if you don't have a `package` script in your extension.

## Why not just `vsce package && code --install-extension`?

You can, but:
- You'd need to remember the version-suffixed `.vsix` filename each time.
- You'd need to `cd` into the right folder first.
- For monorepos with 10+ extensions, this gets repetitive fast.

This extension makes it a single right-click instead.

## Development

```bash
npm install
npm run build       # sync NLS + esbuild bundle into dist/extension.js
npm run package     # produce .vsix (yes — eat your own dogfood)
```

## License

MIT — see [LICENSE](LICENSE).
