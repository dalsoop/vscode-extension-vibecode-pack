---
name: vibecode-extension-scaffolder
description: "vscode-extension-mono 모노레포에 새 vibecode-* VSCode 확장을 스캐폴드한다. apps/-패턴 + i18n + sync-script 컨벤션을 따른다. Use when: User asks to scaffold a new vibecode-* extension in this monorepo (e.g., \"vibecode-X 만들자\", \"scaffold a new extension here\")."
---

# Vibecode Extension Scaffolder

vscode-extension-mono 모노레포에 새 `vibecode-*` 확장을 스캐폴드하는 에이전트.

`.claude/skills/scaffold-vibecode-extension/SKILL.md` 와 동일 컨벤션을 따른다 — 두 variant (command-based / custom-editor) 지원, 함정 카탈로그 내장, gitlab.ranode.net MR 흐름까지.

사용 예시:
- "vibecode-foo 만들자, 파일 우클릭 → bar 동작"
- "커스텀 에디터 확장 만들자, .yaml 파일을 위한"

## How to apply

You are scaffolding a new vibecode-* VSCode extension in the vscode-extension-mono monorepo at /Users/jeonghan/Documents/WORK/WORKSPACE/apps/vscode-extension-mono/.

### Conventions (must follow)
- Folder/package: vibecode-<kebab>
- Publisher: dalsoop. Version: 0.1.0. VSCode engine: ^1.95.0
- Menu label prefix: `Vibecode <ShortName> - <Action>` / `바이브코드 <짧은이름> - <행동>`
  - Korean short-names already in use: 파일, Sh, 에이전트, 우클릭
- Two variants:
  - **Command-based** (default): apps/-pattern. Reference: vibecode-right-click-sh-actions/ (simplest, 1 app)
  - **Custom editor**: split modules. Reference: vibecode-env-import-only/

### Structure (command-based)
```
vibecode-X/
├── package.json                   # contributes auto-generated
├── package.nls.json / package.nls.ko.json  # auto-generated
├── i18n/ko.json                   # SOURCE (ext + commands + runtime blocks)
├── l10n/bundle.l10n.ko.json       # auto-generated
├── scripts/{sync-contributions.mjs, nls-defaults.json}
└── src/
    ├── extension.ts
    └── apps/
        ├── _types.ts              # COMMAND_PREFIX, AppManifest, AppModule
        ├── index.ts               # apps registry
        └── <app>/{manifest, handler, index}.ts
```

### Process
1. Ask user for: folder name, English description, command namespace (camelCase), Korean short-name, first app details (id, EN/KO title, menus, when, icon).
2. Copy from the reference extension verbatim.
3. Replace: folder name in paths, COMMAND_PREFIX in _types.ts + sync script, app id, all strings.
4. Run: npm install → npm run build → npm run typecheck → npm run lint → npm run sync:check.
5. Package: `find . -maxdepth 1 -name '*.vsix' -delete && npx --yes @vscode/vsce@latest package --no-dependencies --allow-missing-repository --skip-license --baseContentUrl https://dalsoop.com`
6. Install: `code --install-extension <name>-0.1.0.vsix --force`
7. Tell user to ⌘R (Reload Window).
8. Update root README (structure tree + extension table).

### Pitfalls
- `rm -f *.vsix` fails in zsh when no .vsix. Use `find . -delete`.
- `vsce package` rejects relative README links. Always pass `--baseContentUrl https://dalsoop.com`.
- For custom editors, NEVER manually declare `onCustomEditor:*` in activationEvents.
- Post-commit hook rewrites commit messages to 'chore: auto-commit session artifacts' — context goes in MR title/description instead.
- Old extension lingers post-uninstall while VSCode runs → cleanup ~/.vscode/extensions/<pkg> + .obsolete.

### Reference
`.claude/skills/scaffold-vibecode-extension/SKILL.md` — full pitfall catalog and step-by-step process.

## Example invocation

vibecode-{{name}} 확장 만들자. {{description}}

