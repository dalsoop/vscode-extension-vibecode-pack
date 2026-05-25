# vibecode-agent-init-this-folder

폴더 우클릭 → 새 에이전트 템플릿 엔트리 스캐폴드 + **좌측 activity bar 사이드바** (템플릿 목록 + `[+]` 추가) + **단일 소스 → 다중 플랫폼 분산** (`.template_md` → `template.json` + `.claude/skills/` + `.claude/agents/`).

```
<우클릭한 폴더>/
└── templates/
    └── 260525143012-foo/      ← yymmddhhmmss-{name}
        └── template.json
```

## 액션

| Trigger | 위치 | 동작 |
|---|---|---|
| `초기화` | Explorer 우클릭한 폴더 | 이름 입력받고 `templates/{ts}-{name}/template.json` 생성 후 자동 열기 |
| `업스트림 확인` | `template.json` 에디터 우상단 ☁ 버튼 / 우클릭 / 팔레트 | `upstream_url` 과 diff 후 Pull/Push 모달 (v0.1 stub) |
| `[+] 템플릿 추가` | 사이드바 상단 navigation 영역 | 활성 워크스페이스 폴더에 `초기화` 위임 |
| `↻ 새로고침` | 사이드바 상단 navigation 영역 | 트리 다시 스캔 |

## 좌측 사이드바

Activity bar 에 📋 아이콘 → 워크스페이스 안의 모든 `templates/<ts>-<name>/template.json` 을 그룹별(폴더 기준)로 트리 표시. 항목 클릭 → JSON 열림. 상단 `[+]` 로 새 템플릿 즉시 추가, `↻` 로 새로고침. 파일시스템 변경 시 자동 갱신.

## JSON 스키마 (확장 UI 가 읽는 포맷)

```ts
interface AgentTemplate {
  title: string;
  content: string;
  prompts: { name: string; body: string }[];
  upstream_url: string;
  ssot: 'local' | 'upstream';
}
```

## `.template_md` 단일 소스 (v0.2+)

`templates/<id>/template.json` 은 이제 **생성 산출물**이고, 진짜 소스는 같은 폴더의 `.template_md` (YAML frontmatter + markdown sections).

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

`npm run render` 가 한 소스에서 모든 target 으로 분산:

| Target | 출력 경로 |
|---|---|
| `this-extension` | `templates/<id-folder>/template.json` (이 확장 UI 가 읽음) |
| `claude-skill` | `<repo-root>/.claude/skills/<id>/SKILL.md` (Claude Code 가 자동 발동) |
| `claude-agent` | `<repo-root>/.claude/agents/<id>.md` (Task tool 로 호출) |
| `codex` | (TODO — 스펙 미정) |

frontmatter `targets:` 에서 활성화할 target 만 나열하면 됨.

### 왜 이런 구조?

`.claude/skills/`, `.claude/agents/`, 미래의 `.codex/`, `.cursor/` 등은 각자 다른 파일 포맷을 요구함. 같은 에이전트 정의를 4번 손으로 동기화하는 대신, 1개 markdown 소스에서 자동 분산.

## 번들된 4개 에이전트

`templates/` 안에 모노레포 작업용 에이전트 4개 (모두 `.template_md` 소스 + 3개 target 분산):

| ID | 무엇을 하는지 |
|---|---|
| `vibecode-extension-scaffolder` | 새 `vibecode-*` 확장 스캐폴드 |
| `vibecode-extension-reviewer` | 변경사항 컨벤션 리뷰 |
| `vibecode-i18n-translator` | 새 로케일 추가 / 번역 |
| `vibecode-build-release-runner` | build → package → install → MR → merge 자동화 |

`000101000000-example/template.json` 은 스키마 참고용 (소스 없이 JSON 만, render 스킵됨).

## 아키텍처

```
vibecode-agent-init-this-folder/
├── package.json                          # contributes + scripts 정의
├── package.nls.json / package.nls.ko.json
├── i18n/ko.json                          # 한국어 i18n 원본
├── l10n/bundle.l10n.ko.json              # 자동 생성
├── scripts/
│   ├── sync-contributions.mjs            # package.json contributes + NLS 자동 생성
│   ├── nls-defaults.json
│   └── render-templates.mjs              # .template_md → 다중 target 분산
├── templates/                            # 번들된 에이전트 카탈로그
│   ├── 000101000000-example/template.json   # legacy 예시 (스키마 참고)
│   └── <ts>-<id>/
│       ├── .template_md                  # SOURCE
│       └── template.json                 # GENERATED (this-extension target)
├── icons/
│   └── agent.svg                         # Activity bar 아이콘 (currentColor monochrome)
└── src/
    ├── extension.ts
    ├── sidebar.ts                        # TreeDataProvider — 워크스페이스 스캔
    └── apps/
        ├── _types.ts                     # AgentTemplate, AppManifest, MenuLocation (view/title 포함)
        ├── index.ts
        ├── init-template-here/{manifest,handler,index}.ts
        ├── check-upstream/{manifest,handler,index}.ts
        ├── add-template/{manifest,handler,index}.ts        # 사이드바 [+]
        └── refresh-templates/{manifest,handler,index}.ts   # 사이드바 ↻
```

## 개발

```bash
npm install
npm run build              # sync → render → tsc
npm run sync               # package.json + NLS 재생성
npm run sync:check         # CI 게이트
npm run render             # .template_md → 모든 target 분산
npm run render:check       # CI 게이트 — diff 있으면 fail
npm run typecheck
npm run lint
npm run package            # .vsix
```

### 새 에이전트 추가
1. `mkdir templates/<yymmddhhmmss>-<name>`
2. `.template_md` 작성 (frontmatter + 3개 section)
3. `npm run render` — 모든 target 출력 생성

### 새 target 추가 (예: .codex)
`scripts/render-templates.mjs` 의 `TARGET_RENDERERS` 에 새 함수 추가:
```js
'codex': (meta, sections) => ({
  path: path.join(REPO_ROOT, '.codex', 'agents', `${meta.id}.md`),
  content: codexRenderer(meta, sections)
})
```

각 `.template_md` 의 `targets:` 에 추가하면 즉시 분산됨.

## SSOT 동기화 (v0.1 stub)

`upstream_url` 이 비어 있지 않으면 ☁ 버튼이 활성된다. 클릭하면:
1. (TODO) 업스트림 fetch → 로컬과 비교
2. 모달: **Pull (업스트림 → 로컬)** / **Push (로컬 → 업스트림)**
3. 현재 양쪽 모두 stub — "Sync logic is not implemented in v0.1." 알림만

실제 전송 로직(HTTPS/Git/Gist)은 URL 형식이 결정된 뒤 v0.2 에서 구현.
