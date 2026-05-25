# vibecode-ai-md-system-init-this-folder

좌측 사이드바에서 **템플릿** 고르고 → **도구**(claude/codex/gemini/cursor) 고르고 → **새 폴더에 즉시 설치**. 기본 도구는 설정에서.

## 사이드바 흐름

```
Activity bar 📋  →  "바이브코드 에이전트"  →  Templates
                                                ├── minimal        (claude · codex · cursor · gemini)
                                                └── with-vibecode-agents (claude)
                                                
상단 navigation:  📁 Open Templates Folder (SSOT)  ·  🚀 Apply…  ·  ↻ Refresh
```

**클릭 1번 = 2-step 마법사**:
1. 템플릿 클릭 → 도구 변형 QuickPick (기본 도구는 ✓ 표시 + 맨 위)
2. 도구 선택 → 폴더 picker
3. 파일 충돌 있으면 "덮어쓰기 / 건너뛰기" 모달
4. 재귀 복사 + Explorer reveal + 알림

**Settings** (Preferences → Settings → "vibecode agent" 검색):
- `vibecodeAiMdSystem.defaultTool` — `claude` / `codex` / `cursor` / `gemini`. QuickPick 기본 선택.

**SSOT**:
- `<extension>/templates/` 가 단일 진실 출처
- 사이드바 상단 📁 버튼 → Finder 로 열기 → 거기서 직접 편집/추가 (단, dev 환경 기준; 설치된 .vsix 는 ext update 때 덮어쓰임 — v2 에서 user-area 오버라이드 예정)

## 액션 전체

| 명령 | Trigger | 동작 |
|---|---|---|
| `applyTemplate` | 사이드바 항목 클릭 / 🚀 / 팔레트 | 2-step 마법사로 템플릿+도구 변형 설치 |
| `openTemplatesFolder` | 사이드바 📁 / 팔레트 | Finder 에 templates/ 열기 |
| `refreshTemplates` | 사이드바 ↻ / 팔레트 | 사이드바 트리 재스캔 |
| `initTemplateHere` | Explorer 폴더 우클릭 | 새 에이전트 정의(agent-definitions) 스캐폴드 (advanced) |
| `checkUpstream` | `template.json` 에디터 ☁ / 우클릭 / 팔레트 | upstream_url 동기화 모달 (v0.1 stub) |

## 디렉토리 구조

```
vibecode-ai-md-system-init-this-folder/
├── templates/                         # SSOT — 설치 가능한 템플릿 카탈로그
│   ├── minimal/
│   │   ├── claude/   └─ .claude/CLAUDE.md, settings.json, skills/example-skill/
│   │   ├── codex/    └─ .codex/README.md
│   │   ├── cursor/   └─ .cursorrules
│   │   └── gemini/   └─ .gemini/README.md
│   └── with-vibecode-agents/
│       └── claude/   └─ .claude/{CLAUDE.md, skills/<4개>, agents/<4개>}
├── agent-definitions/                 # `.template_md` 소스 → 다중 target render
│   ├── 000101000000-example/template.json
│   └── <yymmddhhmmss>-<id>/
│       ├── .template_md               # source
│       └── template.json              # rendered (this-extension target)
├── icons/agent.svg                    # activity bar 아이콘
├── scripts/
│   ├── sync-contributions.mjs         # package.json contributes + NLS 생성
│   ├── nls-defaults.json              # English ext.* / cfg.* 기본값
│   └── render-templates.mjs           # agent-definitions/.template_md → 다중 target
├── package.json                       # contributes.configuration 포함
├── i18n/ko.json                       # ext / cfg / commands / runtime 블록
└── src/
    ├── extension.ts
    ├── sidebar.ts                     # templates/ top-level 스캔 TreeDataProvider
    └── apps/
        ├── _types.ts
        ├── index.ts
        ├── apply-template/            # 2-step 마법사 (template → tool → target)
        ├── open-templates-folder/     # 📁 Finder reveal
        ├── refresh-templates/         # ↻
        ├── init-template-here/        # 우클릭 → 새 agent-definition 스캐폴드
        └── check-upstream/            # 업스트림 동기화 stub
```

## 새 템플릿 추가

```bash
mkdir -p templates/<template-name>/<tool>
# ex: templates/full-stack-ai/claude/, templates/full-stack-ai/codex/, ...
# 그 안에 설치될 파일 그대로 배치 (.claude/CLAUDE.md, .cursorrules, etc)
```

사이드바 ↻ 누르면 즉시 반영. 코드/sync 수정 불필요.

## `.template_md` 시스템 (agent-definitions — 별개 개념)

별개 인프라: agent **정의**(prompts/content)를 markdown 1소스로 작성 → 다중 target render.

```markdown
---
id: my-agent
title: My Agent
description: 한 줄 설명
ssot: local
upstream_url: ""
targets: [this-extension, claude-skill, claude-agent]
when_to_use: |
  User asks for X
agent_tools: [Bash, Read, Write]
---

## Overview
...
## System Prompt
...
## User Prompt
...
```

`npm run render` 분산:

| Target | 출력 경로 |
|---|---|
| `this-extension` | `agent-definitions/<id>/template.json` |
| `claude-skill` | `<repo-root>/.claude/skills/<id>/SKILL.md` |
| `claude-agent` | `<repo-root>/.claude/agents/<id>.md` |
| `codex` | TODO |

agent-definitions 에서 만든 결과물을 `templates/with-vibecode-agents/claude/.claude/{skills,agents}/` 에 정적 복사하면 그게 그 템플릿의 한 부분이 된다. (현재 수동 복사 — v2 에서 render target 으로 자동화 예정)

## 개발

```bash
npm install
npm run build              # sync → render → tsc
npm run sync               # package.json contributes + NLS 재생성
npm run sync:check
npm run render             # agent-definitions/.template_md → 다중 target
npm run render:check
npm run typecheck
npm run lint
npm run package            # .vsix
```

## 알려진 한계 / v2 로드맵

- `Open templates folder` 가 설치된 .vsix 의 read-only 위치를 열어줌 → 끝-유저가 편집해도 ext update 시 사라짐. v2 에서 user-area 오버라이드(`vibecodeAiMdSystem.userTemplatesDir`) 추가 예정.
- "All tools at once" 모드 (한 번에 모든 변형 설치) 없음. 필요 시 v2.
- `checkUpstream` 의 실제 동기화 로직 stub.
- agent-definitions render → `templates/with-vibecode-agents/claude/` 자동 동기화 stub. 지금은 수동 cp.
