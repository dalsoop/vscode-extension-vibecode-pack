# Vibecode Show File Lines

A VSCode sidebar that ranks workspace files by line count so you can spot refactoring targets fast.

## What it does

- Activity Bar icon opens a tree view sorted by line count (descending).
- Toggle between a flat TOP N ranking and groups by file extension.
- Honors `.gitignore`, `.lineignore`, and `files.exclude` (each toggleable).
- Skips binary files and oversized files (configurable cap).

## Settings

All settings live under `vibecodeShowFileLines.*`. Open the Settings UI and filter by that prefix.

## Build

```bash
npm install
npm run build
```
