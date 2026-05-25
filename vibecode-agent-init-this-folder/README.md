# vibecode-agent-init-this-folder

폴더 우클릭 → 새 에이전트 템플릿 엔트리 스캐폴드.

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

## JSON 스키마

```ts
interface AgentTemplate {
  title: string;                          // 짧은 타이틀
  content: string;                        // 마크다운 본문
  prompts: { name: string; body: string }[];  // 여러 개 가능
  upstream_url: string;                   // 빈 문자열이면 동기화 비활성
  ssot: 'local' | 'upstream';             // 진실의 출처 — diff 모달의 기본 방향 결정
}
```

기본값 (init 시):
```json
{
  "title": "<입력한 이름>",
  "content": "",
  "prompts": [],
  "upstream_url": "",
  "ssot": "local"
}
```

## SSOT 동기화 (v0.1 stub)

`upstream_url` 이 비어 있지 않으면 ☁ 버튼이 활성된다. 클릭하면:
1. (TODO) 업스트림 fetch → 로컬과 비교
2. 모달: **Pull (업스트림 → 로컬)** / **Push (로컬 → 업스트림)**
3. 현재 양쪽 모두 stub — "Sync logic is not implemented in v0.1." 알림만

실제 전송 로직(HTTPS/Git/Gist)은 URL 형식이 결정된 뒤 v0.2 에서 구현.

## 번들 카탈로그

[templates/000101000000-example/template.json](templates/000101000000-example/template.json) — 스키마 참고용 예시 1개 포함. 실제 사용자 생성 엔트리는 워크스페이스 안의 우클릭 폴더 밑으로 들어간다.

## 아키텍처

[vibecode-right-click-action-open-to-file](../vibecode-right-click-action-open-to-file/) 과 동일한 모듈 구조 (액션 1개 = `src/apps/<name>/` 폴더 1개).

```
vibecode-agent-init-this-folder/
├── package.json                          # contributes 자동 생성
├── package.nls.json / package.nls.ko.json  # 자동 생성
├── i18n/ko.json                          # 한국어 원본 (ext + commands + runtime)
├── l10n/bundle.l10n.ko.json              # 자동 생성
├── scripts/{sync-contributions.mjs, nls-defaults.json}
├── templates/                            # 번들된 예시 카탈로그 (read-only at runtime)
│   └── 000101000000-example/template.json
└── src/
    ├── extension.ts
    └── apps/
        ├── _types.ts                     # AgentTemplate, AppManifest, ...
        ├── index.ts
        ├── init-template-here/{manifest,handler,index}.ts
        └── check-upstream/{manifest,handler,index}.ts
```

## 개발

```bash
npm install
npm run build       # sync → tsc
npm run typecheck
npm run lint
npm run sync        # package.json + nls 재생성
npm run sync:check  # CI 게이트
npm run package     # .vsix
```
