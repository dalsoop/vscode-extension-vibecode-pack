# Vibecode Skills Viewer

Multi-tool sidebar for installed Claude/Codex/Copilot/Cursor/Windsurf/Cline **agent skills** — preview, search, AI chat, and instruction-file sync, in one place.

> Activity Bar → **Vibecode Skills** → `Skills · Memory · MD` hub.

## What it does

The skills ecosystem fragments across tools: Claude lives in `~/.claude/skills`, Codex in `~/.codex`, Cursor under `.cursor/rules`, Windsurf under `.windsurf`, Cline under `.clinerules`, GitHub Copilot under `.github`, plus skills bundled by installed VSCode extensions. This extension surfaces them all in a single sidebar tree, lets you filter/preview/copy, and keeps your instruction files (CLAUDE.md / AGENTS.md / etc.) in sync with the skills you care about.

## Features

- **Unified sidebar** — global (`~/.claude`, `~/.codex`, `~/.copilot`, `~/.agents`, …), workspace (`.claude`, `.codex`, `.cursor`, `.windsurf`, `.clinerules`, `.github`), and skills bundled by VSCode extensions.
- **Tool chips** — filter the visible list by Claude / Codex / Copilot / Cursor / Windsurf / Cline / custom.
- **Preview** — render any `SKILL.md` in a webview with optional per-section score breakdown.
- **Search & favorites** — fuzzy filter across all sources; pin frequently-used skills.
- **Create / delete** — scaffold new skills, remove obsolete ones.
- **Instruction-file sync** — write a managed block of skill references into `CLAUDE.md`, `AGENTS.md`, `.cursorrules`, and friends. Re-runnable; the block is marker-bounded so it can be regenerated without touching the rest of the file.
- **Skill mirroring** — opt-in auto-mirror of identically-named skills across multiple tool roots (`mirrorSkillsByName`).
- **AI chat participant** — a `@skills` chat participant exposes `list_skills`, `search_skills`, `read_skill`, `recommend_skills`, and category/source/status tools to GitHub Copilot Chat (or any VSCode Language Model Tools host).
- **Memory file shortcuts** — quick access to MEMORY.md / memory folder / memory index used by Claude Code's auto-memory.

## Quick start

1. Install the extension.
2. Open the **Vibecode Skills** view in the Activity Bar.
3. Browse skills grouped by scope and tool. Click any skill to preview its `SKILL.md`.
4. Use the chip row at the top of the sidebar to narrow by tool.
5. Right-click a skill → **Sync to Instruction Files…** to register it in your project's `CLAUDE.md` / `AGENTS.md`.

## Commands

Every command is also available from the command palette.

| Command | What it does |
|---|---|
| `Vibecode Skills - Refresh` | Re-scan all skill sources |
| `Vibecode Skills - Filter Skills` | Open the search box |
| `Vibecode Skills - Preview Skill` | Open the SKILL.md preview webview |
| `Vibecode Skills - Open SKILL.md` | Open the raw markdown |
| `Vibecode Skills - Reveal in Finder` | OS-level reveal |
| `Vibecode Skills - Open Source Folder` | Open the skill's parent folder in VSCode |
| `Vibecode Skills - Toggle Favorite` | Pin/unpin a skill |
| `Vibecode Skills - Create New Skill…` | Scaffold a new skill folder |
| `Vibecode Skills - Sync to Instruction Files…` | Write a Vibecode Skills block into one or more instruction files |
| `Vibecode Skills - Sync to All Instruction Files` | One-shot sync across all detected tool instruction files |
| `Vibecode Skills - Remove Vibecode Skills Block From…` | Strip the managed block back out |

## Settings

| Key | Default | Description |
|---|---|---|
| `vibecode.skillsViewer.includeGlobal` | `true` | Scan `~/.claude`, `~/.codex`, `~/.copilot`, `~/.agents` |
| `vibecode.skillsViewer.includeWorkspace` | `true` | Scan `<workspace>/.claude`, `.codex`, `.github`, `.cursor`, `.windsurf`, `.clinerules` |
| `vibecode.skillsViewer.includeExtensions` | `true` | Scan skills bundled by installed VSCode extensions |
| `vibecode.skillsViewer.tools` | (defaults) | Per-tool enable + custom entries |
| `vibecode.skillsViewer.extraGlobalRoots` | `[]` | Additional global paths to scan |
| `vibecode.skillsViewer.extraWorkspaceRoots` | `[]` | Additional workspace-relative or absolute paths |
| `vibecode.skillsViewer.instructionFormat` | (default) | Output format for instruction-file blocks |
| `vibecode.skillsViewer.language` | `auto` | UI language (`auto` follows VSCode locale) |
| `vibecode.skillsViewer.showToolChips` | `true` | Show the tool filter chip row |
| `vibecode.skillsViewer.showScoreBreakdown` | `false` | Show per-section preview score breakdown |
| `vibecode.skillsViewer.mirrorSkillsByName` | `false` | Auto-mirror SKILL.md across same-named folders in different tool roots |
| `vibecode.skillsViewer.mirrorGroups` | `[]` | Custom file groups whose contents mirror on save |

## AI Chat & Language Model Tools

The extension registers a `@skills` chat participant and exposes these tools to any Language Model Tools host (e.g. Copilot Chat):

- `list_skills` — list everything installed
- `search_skills` — keyword search
- `read_skill` — fetch a full SKILL.md
- `recommend_skills` — suggest skills for a stated goal
- `list_categories` / `skills_in_category` — browse by category
- `list_skill_sources` — show where each skill lives
- `skills_status` — aggregate counts by scope/tool

## Instruction-file sync

The sync flow writes a clearly-marked block into your instruction files:

```
<!-- vibecode-skills:START -->
… managed skill references …
<!-- vibecode-skills:END -->
```

Re-running sync regenerates the block in place; everything outside the markers is preserved. **Remove Vibecode Skills Block From…** safely strips the block.

## License

MIT — see [LICENSE](LICENSE).
