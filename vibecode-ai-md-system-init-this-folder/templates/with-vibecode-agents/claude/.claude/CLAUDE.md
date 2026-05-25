# CLAUDE.md

This project ships with bundled Vibecode agents (skills + sub-agents) for vscode-extension-mono workflows:

- `vibecode-extension-scaffolder` — scaffold a new vibecode-* extension
- `vibecode-extension-reviewer` — review changes against monorepo conventions
- `vibecode-i18n-translator` — add a new locale to i18n/<locale>.json
- `vibecode-build-release-runner` — build / package / install / MR pipeline

Each agent lives in both `.claude/skills/<id>/SKILL.md` (auto-invoked) and `.claude/agents/<id>.md` (Task tool subagent).

Edit this file with project-specific conventions, then trim or extend the bundled agents as the project evolves.
