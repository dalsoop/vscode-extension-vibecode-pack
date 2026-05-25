# Vibecode Right-Click VSIX Package & Install

Right-click a VSCode extension folder in the Explorer to package it as a `.vsix` and install it into your running VSCode — in one shot.

## What it does

1. Verifies the selected folder is a VSCode extension (has `package.json` with `engines.vscode`).
2. Opens an integrated terminal at the folder.
3. Runs (idempotent):
   - `npm install --silent` (in case dependencies are missing)
   - `npm run package` (or falls back to `npx vsce package` if no script defined)
   - `code --install-extension <name>-<version>.vsix`

You see all the output in the terminal. If any step fails, the chain stops there.

## Requirements

- `code` CLI on `PATH` (VSCode → Command Palette → "Shell Command: Install 'code' command in PATH").
- A bash/zsh terminal (default on macOS/Linux). Windows PowerShell is not yet supported.

## Build

```bash
npm install
npm run build
```
